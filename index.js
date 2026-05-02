/**
 * WhatsApp Bot – Hugging Face (Session‑ID only, stable)
 * Express server + dummy ffmpeg‑static + session loader.
 */
process.removeAllListeners('warning');
process.env.NODE_NO_WARNINGS = '1';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const express = require('express');

// ══════════════════════════════════════════════════════
// 1. Dummy ffmpeg‑static (points to system ffmpeg)
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

// ══════════════════════════════════════════════════════
// 2. Express keep‑alive server (prevents Space pausing)
// ══════════════════════════════════════════════════════
const app = express();
const PORT = process.env.PORT || 7860;
app.get('/', (req, res) => res.send('Bot is running…'));
app.get('/health', (req, res) => res.send('OK'));
app.listen(PORT, () => console.log(`🌐 Keep‑alive server on port ${PORT}`));

// ── Load dependencies ────────────────────────────────
const pino = require('pino');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} = require('@whiskeysockets/baileys');
const config = require('./config');
const handler = require('./handler');

// ── Session management ───────────────────────────────
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

// ══════════════════════════════════════════════════════
// Bot startup
// ══════════════════════════════════════════════════════
async function startBot() {
  if (!loadSessionFromEnv()) {
    console.error('⚠️  Cannot start – no valid session. Add SESSION_ID secret and restart.');
    return;
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'info' }),
    printQRInTerminal: false,
    browser: ['Chrome', 'Windows', '10.0'],
    auth: state,
    syncFullHistory: false,
    downloadHistory: false,
    markOnlineOnConnect: false,
    getMessage: async () => undefined,
    connectTimeoutMs: 60_000,
    defaultQueryTimeoutMs: 30_000,
    keepAliveIntervalMs: 20_000,
  });

  const rawOwner = Array.isArray(config.ownerNumber) ? config.ownerNumber[0] : config.ownerNumber;
  const ownerJid = `${rawOwner.replace(/[^0-9]/g, '')}@s.whatsapp.net`;

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'connecting') console.log('⏳ Connecting…');
    if (connection === 'open') {
      console.log('✅ Bot connected successfully!');
      sock.sendMessage(ownerJid, { text: '✅ Bot is Online!' }).catch(() => {});
    }
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`🔁 Connection closed (${statusCode}). Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) setTimeout(startBot, 5000);
      else console.error('⛔ Logged out. Generate a new SESSION_ID.');
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

// ── Start the bot ────────────────────────────────────
startBot();
