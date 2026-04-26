/**
 * WhatsApp Bot – Hugging Face (Session‑ID only, stable connection)
 * No pairing code, no QR – uses KnightBot session from SESSION_ID secret.
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
// 2. Dummy ffmpeg‑static (no change needed, just fix)
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

// ── Express server (keeps Hugging Face alive) ──
const app = express();
const PORT = process.env.PORT || 7860;

app.get('/', (req, res) => res.send('<h2>Bot is running…</h2>'));

// ── Session management ─────────────────────
const sessionFolder = `./${config.sessionName || 'session'}`;
const sessionFile = path.join(sessionFolder, 'creds.json');

/**
 * Decodes a KnightBot session ID and writes the credentials file.
 * Returns true if successful, false otherwise.
 */
function loadSessionFromEnv() {
  const sessionID = config.sessionID;
  if (!sessionID || !sessionID.startsWith('KnightBot!')) {
    console.error('❌ No valid SESSION_ID (must start with KnightBot!)');
    return false;
  }

  try {
    const [header, b64data] = sessionID.split('!');
    if (header !== 'KnightBot' || !b64data) throw new Error('Invalid format');

    // Clean up any trailing dots that sometimes appear
    const cleanB64 = b64data.replace(/\.{3}$/, '');
    const compressed = Buffer.from(cleanB64, 'base64');
    const decompressed = zlib.gunzipSync(compressed);

    // Ensure the session directory exists
    if (!fs.existsSync(sessionFolder)) {
      fs.mkdirSync(sessionFolder, { recursive: true });
    }
    fs.writeFileSync(sessionFile, decompressed, 'utf8');
    console.log('📡 Session loaded from KnightBot ID');
    return true;
  } catch (err) {
    console.error('❌ Failed to decode session:', err.message);
    console.error('   Make sure your SESSION_ID is exactly the string from the KnightBot site.');
    return false;
  }
}

// ═══════════════════════════════════════════
// Bot startup
// ═══════════════════════════════════════════
async function startBot() {
  // Try to load session from environment variable
  const sessionReady = loadSessionFromEnv();
  if (!sessionReady) {
    console.error('⚠️  Cannot start – no valid session. Add SESSION_ID secret and restart.');
    return;
  }

  // Use the session we just wrote (or the existing one)
  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),   // suppress internal Baileys noise
    printQRInTerminal: false,
    browser: ['Chrome', 'Windows', '10.0'],
    auth: state,
    syncFullHistory: false,
    downloadHistory: false,
    markOnlineOnConnect: false,
    getMessage: async () => undefined,
    connectTimeoutMs: 60_000,            // wait a bit longer for connection
  });

  // Extract owner number for notifications
  const rawOwner = Array.isArray(config.ownerNumber) ? config.ownerNumber[0] : config.ownerNumber;
  const ownerNumber = rawOwner.replace(/[^0-9]/g, '');
  const ownerJid = `${ownerNumber}@s.whatsapp.net`;

  // ── Connection handling ─────────────────
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      console.log('✅ Bot connected successfully!');
      // Notify owner
      try {
        await sock.sendMessage(ownerJid, { text: '✅ Bot is Online!' });
      } catch (e) {
        console.error('⚠️ Could not send owner notification:', e.message);
      }
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      // 401 = logged out (session invalid)
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`🔁 Connection closed (status ${statusCode}). Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) {
        // Wait before reconnecting to avoid hammering the server
        setTimeout(() => startBot(), 5000);
      } else {
        console.error('⛔ Session is logged out. Generate a new SESSION_ID from KnightBot site.');
      }
    }
  });

  // Save credentials whenever they update
  sock.ev.on('creds.update', saveCreds);

  // ── Message handler ─────────────────────
  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return; // only new messages
    for (const msg of messages) {
      if (msg.message) {
        handler.handleMessage(sock, msg).catch(() => {});
      }
    }
  });
}

// ── Start server & bot ─────────────────
app.listen(PORT, () => {
  console.log(`🚀 Web UI listening on port ${PORT}`);
  startBot().catch((err) => {
    console.error('❌ Bot crashed:', err);
    // Retry after a short delay
    setTimeout(startBot, 10_000);
  });
});
