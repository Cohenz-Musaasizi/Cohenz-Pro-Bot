/**
 * WhatsApp Bot – Render / Hugging Face (Session‑ID only, stable)
 * No pairing code, no QR – uses KnightBot session from SESSION_ID secret.
 * Quiet logging – use for normal operation.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ══════════════════════════════════════════════════════
// 1. Bridge for the real mumaker (text‑effect commands)
// ══════════════════════════════════════════════════════
const mumakerDir = path.join(__dirname, 'node_modules', 'mumaker');
if (!fs.existsSync(mumakerDir)) {
  fs.mkdirSync(mumakerDir, { recursive: true });
}
fs.writeFileSync(
  path.join(mumakerDir, 'index.js'),
  'module.exports = require("../../utils/mumaker.js");'
);
console.log('✅ Real mumaker bridge created');

// ══════════════════════════════════════════════════════
// 2. Dummy ffmpeg‑static (points to system ffmpeg)
// ══════════════════════════════════════════════════════
const ffmpegStaticDir = path.join(__dirname, 'node_modules', 'ffmpeg-static');
if (!fs.existsSync(ffmpegStaticDir)) {
  fs.mkdirSync(ffmpegStaticDir, { recursive: true });
}
fs.writeFileSync(
  path.join(ffmpegStaticDir, 'index.js'),
  `module.exports = '/usr/bin/ffmpeg';`
);
console.log('✅ Dummy ffmpeg‑static ready');

// ── Load real dependencies ─────────────────
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

// ── Express server (keeps Render alive for health checks) ──
const app = express();
const PORT = process.env.PORT || 7860;

app.get('/', (req, res) => res.send('<h2>Bot is running…</h2>'));
app.get('/health', (req, res) => res.send('OK'));

// ── Session management ─────────────────────
const sessionFolder = `./${config.sessionName || 'session'}`;
const sessionFile = path.join(sessionFolder, 'creds.json');

function loadSessionFromEnv() {
  const sessionID = config.sessionID;
  if (!sessionID || !sessionID.startsWith('KnightBot!')) {
    console.error('❌ No valid SESSION_ID (must start with KnightBot!)');
    return false;
  }

  try {
    const [header, b64data] = sessionID.split('!');
    if (header !== 'KnightBot' || !b64data) throw new Error('Invalid format');
    const cleanB64 = b64data.replace(/\.{3}$/, '');
    const compressed = Buffer.from(cleanB64, 'base64');
    const decompressed = zlib.gunzipSync(compressed);

    if (!fs.existsSync(sessionFolder)) {
      fs.mkdirSync(sessionFolder, { recursive: true });
    }
    fs.writeFileSync(sessionFile, decompressed, 'utf8');
    console.log('📡 Session loaded from KnightBot ID');
    return true;
  } catch (err) {
    console.error('❌ Failed to decode session:', err.message);
    return false;
  }
}

// ═══════════════════════════════════════════
// Bot startup
// ═══════════════════════════════════════════
async function startBot() {
  if (!loadSessionFromEnv()) {
    console.error('⚠️  No valid session. Add SESSION_ID secret and restart.');
    return;
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'info' }),   // keep logs quiet
    printQRInTerminal: false,
    browser: ['Chrome', 'Windows', '10.0'],
    auth: state,
    syncFullHistory: false,
    downloadHistory: false,
    markOnlineOnConnect: false,
    getMessage: async () => undefined,
    connectTimeoutMs: 30_000,
    defaultQueryTimeoutMs: 15_000,
  });

  const rawOwner = Array.isArray(config.ownerNumber) ? config.ownerNumber[0] : config.ownerNumber;
  const ownerNumber = rawOwner.replace(/[^0-9]/g, '');
  const ownerJid = `${ownerNumber}@s.whatsapp.net`;

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      console.log('✅ Bot connected successfully!');
      try {
        await sock.sendMessage(ownerJid, { text: '✅ Bot is Online!' });
      } catch (e) {
        console.error('⚠️ Could not send owner notification:', e.message);
      }
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`🔁 Connection closed (status ${statusCode}). Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) {
        setTimeout(() => startBot(), 5000);
      } else {
        console.error('⛔ Session logged out. Generate a new SESSION_ID from KnightBot site.');
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

app.listen(PORT, () => {
  console.log(`🚀 Web UI listening on port ${PORT}`);
  startBot().catch((err) => {
    console.error('❌ Bot crashed:', err);
    setTimeout(startBot, 10_000);
  });
});

// Self‑ping every 4 minutes to prevent Render from sleeping
setInterval(() => {
  try {
    require('http').get(`http://localhost:${PORT}/health`);
  } catch (e) {}
}, 4 * 60 * 1000);
