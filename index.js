/**
 * WhatsApp Bot – Hugging Face (Pairing Code Web UI)
 * Waits for stable pairing and doesn't restart while a code is active.
 */

const fs = require('fs');
const path = require('path');

// ══════════════════════════════════════════════════════
// Dummy mumaker module
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
// Dummy ffmpeg-static module (uses system ffmpeg)
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
const PORT = process.env.PORT || 7860;

let currentCode = '';
let codeGenerated = false;
let botIsConnected = false;
let pairingInProgress = false;   // true while a valid code is being shown
let pairingTimeout = null;       // timer to clear the code

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
// Clean old session for a fresh start
if (fs.existsSync(sessionFolder)) {
  fs.rmSync(sessionFolder, { recursive: true, force: true });
}
fs.mkdirSync(sessionFolder, { recursive: true });

async function startBot() {
  // Reset state for a new connection attempt
  codeGenerated = false;
  currentCode = '';
  pairingInProgress = false;
  if (pairingTimeout) clearTimeout(pairingTimeout);

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

  const rawOwner = Array.isArray(config.ownerNumber) ? config.ownerNumber[0] : config.ownerNumber;
  const ownerNumber = rawOwner.replace(/[^0-9]/g, '');
  const ownerJid = `${ownerNumber}@s.whatsapp.net`;

  let pairingRequested = false;

  // Function to request the pairing code
  const requestCode = async () => {
    if (pairingRequested) return;
    pairingRequested = true;
    try {
      const code = await sock.requestPairingCode(ownerNumber);
      currentCode = code;
      codeGenerated = true;
      pairingInProgress = true;
      console.log(`\n🔢 Pairing code: ${code}`);
      console.log('📱 Open WhatsApp → Linked Devices → Link with phone number');

      // Clear the code after 60 seconds
      pairingTimeout = setTimeout(() => {
        codeGenerated = false;
        currentCode = '';
        pairingInProgress = false;
        pairingRequested = false;   // allow a new attempt later
        console.log('⌛ Pairing code expired. Restart the bot to get a new one.');
      }, 60000);
    } catch (err) {
      console.error('❌ Failed to get pairing code:', err.message);
      pairingRequested = false;
      pairingInProgress = false;
      // Retry after 5 seconds
      setTimeout(() => startBot(), 5000);
    }
  };

  // Connection update handler
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    // Request code once we hit 'connecting'
    if (connection === 'connecting' && !pairingRequested) {
      console.log('⏳ Connecting to WhatsApp...');
      setTimeout(() => requestCode(), 2000);
    }

    if (connection === 'open') {
      botIsConnected = true;
      if (pairingTimeout) clearTimeout(pairingTimeout);
      currentCode = '';
      codeGenerated = false;
      pairingInProgress = false;
      pairingRequested = false;
      console.log('✅ Bot connected successfully!');
      await sock.sendMessage(ownerJid, { text: '✅ Bot is Online!' });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const reason = lastDisconnect?.error?.message || '';

      // If a pairing code is active, do NOT restart immediately.
      // The user might still be entering the code on their phone.
      if (pairingInProgress && statusCode !== DisconnectReason.loggedOut) {
        console.log('🔁 Pairing code active – waiting for you to link. Code valid for a few more seconds.');
        // We simply don't call startBot() here, leaving the socket inactive.
        // The timeout set above will eventually clean up and allow a restart.
        return;
      }

      // Otherwise, reconnect as usual
      botIsConnected = false;
      pairingRequested = false;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        setTimeout(() => startBot(), 3000);
      }
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

// Start server & bot
app.listen(PORT, () => {
  console.log(`🚀 Web UI running on port ${PORT}`);
  startBot().catch(err => {
    console.error('Bot crashed:', err);
    setTimeout(startBot, 5000);
  });
});
