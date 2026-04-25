/**
 * WhatsApp Bot – Hugging Face (Session ID only, no pairing)
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

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
console.log('✅ Dummy mumaker ready');

// ══════════════════════════════════════════════════════
// Dummy ffmpeg-static module
// ══════════════════════════════════════════════════════
const ffmpegDir = path.join(__dirname, 'node_modules', 'ffmpeg-static');
const ffmpegFile = path.join(ffmpegDir, 'index.js');
if (!fs.existsSync(ffmpegDir)) {
  fs.mkdirSync(ffmpegDir, { recursive: true });
}
fs.writeFileSync(ffmpegFile, `module.exports = '/usr/bin/ffmpeg';`);
console.log('✅ Dummy ffmpeg-static ready');

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

app.get('/', (req, res) => res.send('<h2>Bot is active. Check logs for status.</h2>'));

// ── Session folder ───────────────────────────────
const sessionFolder = `./${config.sessionName || 'session'}`;
const sessionFile = path.join(sessionFolder, 'creds.json');

// ── Load session from KnightBot ID ──────────────
function loadSessionFromID() {
  const sessionID = config.sessionID;
  if (!sessionID || !sessionID.startsWith('KnightBot!')) return false;

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
  } catch (e) {
    console.error('❌ Failed to load session:', e.message);
    return false;
  }
}

// ── Bot start ────────────────────────────────────
async function startBot() {
  const hasSession = loadSessionFromID();
  if (!hasSession) {
    console.error('⚠️ No valid SESSION_ID provided. Bot will not connect.');
    return;
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

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      console.log('✅ Bot connected!');
      await sock.sendMessage(ownerJid, { text: '✅ Bot is Online!' });
    }

    if (connection === 'close') {
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

app.listen(PORT, () => {
  console.log(`🚀 Server ready on port ${PORT}`);
  startBot().catch(err => {
    console.error('Bot crashed:', err);
    setTimeout(startBot, 5000);
  });
});
