/**
 * WhatsApp Bot – Hugging Face (Pairing Code Web UI)
 * Robust pairing code request with proper connection state handling
 */

const fs = require('fs');
const path = require('path');

// ══════════════════════════════════════════════════════
// Create dummy mumaker module BEFORE any command loads
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
// Create dummy ffmpeg-static module (uses system ffmpeg)
// ══════════════════════════════════════════════════════
const ffmpegDir = path.join(__dirname, 'node_modules', 'ffmpeg-static');
const ffmpegFile = path.join(ffmpegDir, 'index.js');
if (!fs.existsSync(ffmpegDir)) {
  fs.mkdirSync(ffmpegDir, { recursive: true });
}
fs.writeFileSync(ffmpegFile, `module.exports = '/usr/bin/ffmpeg';`);
console.log('✅ Created dummy ffmpeg-static module');

// ── Load real dependencies ──────────────────────────
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
const PORT = process.env.PORT || 3000;

let currentCode = '';
let codeGenerated = false;
let botIsConnected = false;

// ── Pairing Code Web Page ─────────────────────────
const getPairingPage = () => {
  if (botIsConnected) {
    return `<html><head><title>Bot Connected</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="text-align:center;font-family:sans-serif;padding-top:50px;"><h2>✅ Bot is already connected!</h2></body></html>`;
  }
  if (!codeGenerated) {
    return `<html><head><title>Generating Code...</title><meta name="viewport" content="width=device-width, initial-scale=1"><script>setTimeout(()=>location.reload(),3000);</script></head><body style="text-align:center;font-family:sans-serif;padding-top:50px;"><h2>⏳ Generating pairing code...</h2><p>Page auto‑refreshes.</p></body></html>`;
  }
  const formatted = currentCode?.match(/.{1,4}/g)?.join('-') || currentCode;
  const raw = currentCode || '';
  return `
  <html>
    <head><title>Link Your Device</title><meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { font-family: sans-serif; text-align: center; background: #f0f2f5; padding: 20px; }
      .container { max-width: 400px; margin: 0 auto; background: white; border-radius: 20px; padding: 30px; box-shadow:0 0 15px rgba(0,0,0,0.1); }
      h2 { color: #075e54; margin-bottom: 5px; }
      .code { font-size: 2.3rem; font-weight: bold; letter-spacing: 4px; background: #e7ffdb; padding: 20px; border-radius: 12px; margin: 20px 0; border: 2px solid #25D366; word-break: break-all; }
      button { background: #25D366; color: white; border: none; padding: 14px 30px; font-size: 1.1rem; border-radius: 30px; cursor: pointer; margin: 10px 0; width: 80%; }
      button:active { background: #128c7e; }
      .instructions { text-align: left; margin-top: 20px; color: #333; font-size: 0.95rem; }
      .timer { color: #e63946; font-weight: bold; }
    </style></head>
    <body>
      <div class="container">
        <h2>🔐 Pairing Code</h2>
        <div class="code" id="code">${formatted}</div>
        <button onclick="copyCode()">📋 Copy Code</button>
        <p id="msg" style="color:green;display:none;">✔ Copied!</p>
        <div class="instructions">
          <p><b>1.</b> Open <b>WhatsApp</b> on this phone<br>
          <b>2.</b> Go to <b>Settings → Linked Devices → Link with phone number</b><br>
          <b>3.</b> Enter the code above<br>
          <b>4.</b> Tap <b>Confirm</b><br>
          💡 You may already see a prompt to enter the code – just tap it!</p>
          <p class="timer">⚠️ Code valid for 60 seconds</p>
        </div>
      </div>
      <script>
        function copyCode() { navigator.clipboard.writeText('${raw}'); document.getElementById('msg').style.display = 'block'; }
        setTimeout(() => location.reload(), 55000);
      </script>
    </body>
  </html>`;
};

app.get('/', (req, res) => res.send(getPairingPage()));
app.get('/health', (req, res) => res.send(botIsConnected ? 'Connected' : 'Waiting'));

// ── Bot Setup ─────────────────────────────────────
const sessionFolder = './session';
// Always start fresh to avoid stale sessions
if (fs.existsSync(sessionFolder)) {
  fs.rmSync(sessionFolder, { recursive: true, force: true });
}
fs.mkdirSync(sessionFolder, { recursive: true });

async function startBot() {
  codeGenerated = false;
  currentCode = '';

  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,        // we handle pairing codes manually
    browser: ['Chrome', 'Windows', '10.0'],
    auth: state,
    syncFullHistory: false,
    downloadHistory: false,
    markOnlineOnConnect: false,
    getMessage: async () => undefined
  });

  // Extract owner number correctly from array
  const rawOwner = Array.isArray(config.ownerNumber) ? config.ownerNumber[0] : config.ownerNumber;
  const ownerNumber = rawOwner.replace(/[^0-9]/g, '');
  const ownerJid = `${ownerNumber}@s.whatsapp.net`;

  // ── Pairing Code Request ───────────────────────
  // We must wait until the socket is "connecting" before requesting the code
  let pairingRequested = false;

  const requestCode = async () => {
    if (pairingRequested) return;
    pairingRequested = true;
    try {
      const code = await sock.requestPairingCode(ownerNumber);
      currentCode = code;
      codeGenerated = true;
      console.log(`\n🔢 Pairing code: ${code}`);
      // Expire the code after 60s (auto-retry logic will refresh)
      setTimeout(() => {
        codeGenerated = false;
        currentCode = '';
      }, 60000);
    } catch (err) {
      console.error('❌ Failed to get pairing code:', err.message);
      // Reset flag to allow retrying on next connection attempt
      pairingRequested = false;
      codeGenerated = false;
      currentCode = '';
      // Wait a few seconds and try again if still connecting
      setTimeout(() => {
        if (sock.user && !botIsConnected) {
          // Force a reconnect to trigger a new connection cycle
          sock.end();
        }
      }, 5000);
    }
  };

  // Connection update handler
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    // Only request code when we hit 'connecting' state and haven't requested yet
    if (connection === 'connecting' && !pairingRequested) {
      console.log('⏳ Connecting to WhatsApp...');
      // Delay slightly to ensure the socket is stable
      setTimeout(() => requestCode(), 2000);
    }

    if (connection === 'open') {
      botIsConnected = true;
      currentCode = '';
      codeGenerated = false;
      console.log('✅ Bot connected successfully!');
      await sock.sendMessage(ownerJid, { text: '✅ Bot is Online!' });
    }

    if (connection === 'close') {
      botIsConnected = false;
      pairingRequested = false;
      codeGenerated = false;
      currentCode = '';
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        setTimeout(() => startBot(), 3000);
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // Message handling
  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (msg.message) handler.handleMessage(sock, msg).catch(() => {});
    }
  });
}

// Start server & bot
app.listen(PORT, () => {
  console.log(`🚀 Web UI running on port ${PORT}`);
  startBot().catch(err => {
    console.error('Bot crashed:', err);
    setTimeout(startBot, 5000);
  });
});
