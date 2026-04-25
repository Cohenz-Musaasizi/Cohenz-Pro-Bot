/**
 * WhatsApp Bot – Hugging Face (Session ID Primary / Pairing Code Fallback)
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ══════════════════════════════════════════════════════
// Create dummy mumaker module
// ══════════════════════════════════════════════════════
const mumakerDir = path.join(__dirname, 'node_modules', 'mumaker');
const mumakerFile = path.join(mumakerDir, 'index.js');
if (!fs.existsSync(mumakerDir)) {
  fs.mkdirSync(mumakerDir, { recursive: true });
}
fs.writeFileSync(mumakerFile, `module.exports = {
  exec: async (text) => {
    const placeholderUrl = 'https://via.placeholder.com/600x200.png?text=' + encodeURIComponent(text);
    return { image: placeholderUrl };
  }
};`);
console.log('✅ Created dummy mumaker module');

// ══════════════════════════════════════════════════════
// Dummy ffmpeg-static module
// ══════════════════════════════════════════════════════
const ffmpegDir = path.join(__dirname, 'node_modules', 'ffmpeg-static');
const ffmpegFile = path.join(ffmpegDir, 'index.js');
if (!fs.existsSync(ffmpegDir)) {
  fs.mkdirSync(ffmpegDir, { recursive: true });
}
fs.writeFileSync(ffmpegFile, `module.exports = '/usr/bin/ffmpeg';`);
console.log('✅ Created dummy ffmpeg-static module');

// ── Real dependencies ─────────────────────────────
const pino = require('pino');
const express = require('express');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} = require('@whiskeysockets/baileys');
const config = require('./config');
const handler = require('./handler');

const app = express();
const PORT = process.env.PORT || 7860;

let pairingCode = '';
let codeShown = false;
let botConnected = false;

// ══════════════════════════════════════════════════════
// Web Page (pairing code UI as fallback)
// ══════════════════════════════════════════════════════
app.get('/', (req, res) => {
  if (botConnected) {
    res.send(`<html><head><title>Connected</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="text-align:center;font-family:sans-serif;padding-top:50px;"><h2>✅ Bot is already connected!</h2></body></html>`);
  } else if (codeShown && pairingCode) {
    const formatted = pairingCode.match(/.{1,4}/g)?.join('-') || pairingCode;
    res.send(`
      <html>
      <head><title>Pairing Code</title><meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: sans-serif; text-align: center; padding: 20px; }
        .code { font-size: 2.3rem; font-weight: bold; letter-spacing: 4px; background: #e7ffdb; padding: 20px; border-radius: 12px; margin: 20px; border: 2px solid #25D366; display: inline-block; }
        button { background: #25D366; color: white; border: none; padding: 14px 30px; font-size: 1.1rem; border-radius: 30px; cursor: pointer; }
      </style></head>
      <body>
        <h2>🔐 Pairing Code</h2>
        <div class="code">${formatted}</div>
        <button onclick="navigator.clipboard.writeText('${pairingCode}');alert('Copied!')">📋 Copy Code</button>
        <p><b>1.</b> Open WhatsApp → Linked Devices → Link with phone number<br>
        <b>2.</b> Enter the code above<br>
        <b>3.</b> Tap Confirm</p>
        <p style="color:red;">⚠️ Code valid for 60 seconds</p>
        <script>setTimeout(() => location.reload(), 55000);</script>
      </body></html>`);
  } else {
    res.send(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><script>setTimeout(()=>location.reload(),3000);</script></head><body style="text-align:center;padding-top:50px;"><h2>⏳ Waiting for connection...</h2></body></html>`);
  }
});

// ── Session folder path ───────────────────────────
const sessionFolder = `./${config.sessionName || 'session'}`;
const sessionFile = path.join(sessionFolder, 'creds.json');

// ── KnightBot Session Handler ─────────────────────
function handleKnightBotSession() {
  const sessionID = config.sessionID;
  if (!sessionID || !sessionID.startsWith('KnightBot!')) return false;

  try {
    const [header, b64data] = sessionID.split('!');
    if (header !== 'KnightBot' || !b64data) throw new Error('Invalid session format');

    const cleanB64 = b64data.replace(/\.{3}$/, '');
    const compressedData = Buffer.from(cleanB64, 'base64');
    const decompressedData = zlib.gunzipSync(compressedData);

    if (!fs.existsSync(sessionFolder)) {
      fs.mkdirSync(sessionFolder, { recursive: true });
    }
    fs.writeFileSync(sessionFile, decompressedData, 'utf8');
    console.log('📡 Session loaded from KnightBot ID');
    return true;   // session file created
  } catch (error) {
    console.error('❌ Failed to load KnightBot session:', error.message);
    return false;
  }
}

// ── Start Bot ─────────────────────────────────────
async function startBot() {
  // If a KnightBot session is provided, use it; otherwise, start fresh for pairing code
  const hasValidSession = handleKnightBotSession();
  if (hasValidSession) {
    console.log('🔄 Using KnightBot session – no pairing needed.');
  } else {
    // No session ID – clean slate for pairing code (if we ever need it)
    if (fs.existsSync(sessionFolder)) {
      fs.rmSync(sessionFolder, { recursive: true, force: true });
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['Chrome', 'Windows', '10.0'],
    auth: state,
    syncFullHistory: false,
    downloadHistory: false,
    markOnlineOnConnect: false,
    getMessage: async () => undefined
  });

  const ownerNumber = (Array.isArray(config.ownerNumber) ? config.ownerNumber[0] : config.ownerNumber)
    .replace(/[^0-9]/g, '');
  const ownerJid = `${ownerNumber}@s.whatsapp.net`;

  // Connection handling
  let pairingRequested = false;
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    // Only attempt pairing code if NO valid session was provided
    if (!hasValidSession && connection === 'connecting' && !pairingRequested) {
      pairingRequested = true;
      try {
        const code = await sock.requestPairingCode(ownerNumber);
        pairingCode = code;
        codeShown = true;
        console.log(`🔢 Pairing code: ${code}`);
        setTimeout(() => { codeShown = false; pairingCode = ''; }, 60000);
      } catch (err) {
        console.error('❌ Pairing code request failed:', err.message);
        pairingRequested = false;
      }
    }

    if (connection === 'open') {
      botConnected = true;
      console.log('✅ Bot connected!');
      await sock.sendMessage(ownerJid, { text: '✅ Bot is Online!' });
    }

    if (connection === 'close') {
      botConnected = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnecting:', shouldReconnect);
      if (shouldReconnect) setTimeout(startBot, 3000);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (msg.message) handler.handleMessage(sock, msg).catch(() => {});
    }
  });
}

// ── Start Server ──────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Web UI running on port ${PORT}`);
  startBot().catch(err => {
    console.error('Bot crashed:', err);
    setTimeout(startBot, 5000);
  });
});
