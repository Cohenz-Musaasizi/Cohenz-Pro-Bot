/**
 * WhatsApp Bot - Hugging Face (QR Code Web UI)
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
// Dummy ffmpeg-static module (points to system ffmpeg)
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
const { toDataURL } = require('qrcode');
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

let currentQR = '';           // will hold the QR string
let botIsConnected = false;

// ── Web page that shows QR code ────────────────────
app.get('/', async (req, res) => {
  if (botIsConnected) {
    return res.send(`<html><body style="text-align:center;padding-top:50px;"><h2>✅ Bot connected!</h2></body></html>`);
  }
  if (currentQR) {
    try {
      const qrImage = await toDataURL(currentQR);
      res.send(`
        <html>
          <head><title>Scan QR</title><meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: sans-serif; text-align: center; padding: 20px; }
            img { max-width: 300px; border: 5px solid #25D366; border-radius: 15px; margin: 20px 0; }
            button { background: #25D366; color: white; border: none; padding: 12px 24px; font-size: 1rem; border-radius: 30px; cursor: pointer; }
          </style></head>
          <body>
            <h2>📱 Scan with WhatsApp</h2>
            <img src="${qrImage}" alt="QR Code">
            <p><b>1.</b> Open WhatsApp → Linked Devices → Scan QR<br>
            <b>2.</b> If no second device, screenshot this page and use <b>Scan from gallery</b><br>
            <b>3.</b> Tap Confirm when prompted</p>
            <p style="color:gray;">Page auto-refreshes for new QR.</p>
            <script>setTimeout(() => location.reload(), 55000);</script>
          </body>
        </html>
      `);
    } catch (e) {
      res.send('QR not ready...');
    }
  } else {
    res.send(`<html><head><script>setTimeout(()=>location.reload(),3000);</script></head><body style="text-align:center;padding-top:50px;"><h2>⏳ Generating QR...</h2></body></html>`);
  }
});

app.get('/health', (req, res) => res.send(botIsConnected ? 'Connected' : 'Waiting'));

// ── Bot setup ─────────────────────────────────────
const sessionFolder = './session';
if (fs.existsSync(sessionFolder)) {
  fs.rmSync(sessionFolder, { recursive: true, force: true });
}
fs.mkdirSync(sessionFolder, { recursive: true });

async function startBot() {
  currentQR = '';
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

  // QR event – store the QR string so the web page shows it
  sock.ev.on('connection.update', async (update) => {
    const { qr, connection, lastDisconnect } = update;

    if (qr) {
      currentQR = qr;
      console.log('📲 QR code generated! Open your Space URL.');
    }

    if (connection === 'open') {
      botIsConnected = true;
      currentQR = '';
      console.log('✅ Bot connected!');
      const rawOwner = Array.isArray(config.ownerNumber) ? config.ownerNumber[0] : config.ownerNumber;
      const ownerJid = `${rawOwner.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
      await sock.sendMessage(ownerJid, { text: '✅ Bot is Online!' });
    }

    if (connection === 'close') {
      botIsConnected = false;
      currentQR = '';
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnecting:', shouldReconnect);
      if (shouldReconnect) startBot();
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

app.listen(PORT, () => {
  console.log(`🚀 Web UI running on port ${PORT}`);
  startBot().catch(err => {
    console.error('Bot crashed:', err);
    setTimeout(startBot, 5000);
  });
});
