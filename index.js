/**
 * WhatsApp MD Bot - Main Entry Point (Session-ID only)
 */
process.env.PUPPETEER_SKIP_DOWNLOAD = 'true';
process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';
process.env.PUPPETEER_CACHE_DIR = process.env.PUPPETEER_CACHE_DIR || '/tmp/puppeteer_cache_disabled';

// 1. Dummy ffmpeg-static (points to system ffmpeg)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const os = require('os');

const ffmpegStaticDir = path.join(__dirname, 'node_modules', 'ffmpeg-static');
if (!fs.existsSync(ffmpegStaticDir)) {
  fs.mkdirSync(ffmpegStaticDir, { recursive: true });
}
fs.writeFileSync(
  path.join(ffmpegStaticDir, 'index.js'),
  `module.exports = '/usr/bin/ffmpeg';`
);
console.log('✅ Dummy ffmpeg-static ready');

// 2. Express server (keeps Hugging Face / Render alive)
const express = require('express');
const app = express();
const PORT = process.env.PORT || 7860;
app.get('/', (req, res) => res.send('Bot is running…'));
app.get('/health', (req, res) => res.send('OK'));
app.listen(PORT, () => console.log(`🌐 Web server on port ${PORT}`));

// 3. Load dependencies after server starts
const pino = require('pino');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const config = require('./config');
const handler = require('./handler');

// 4. Console log filtering (suppress encryption noise)
const forbiddenPatternsConsole = [
  'closing session', 'sessionentry', 'prekey bundle', 'pendingprekey',
  '_chains', 'registrationid', 'currentratchet', 'chainkey', 'ratchet',
  'signal protocol', 'ephemeralkeypair', 'indexinfo', 'basekey'
];
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
console.log = (...args) => {
  const msg = args.map(a => typeof a === 'string' ? a : typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ').toLowerCase();
  if (!forbiddenPatternsConsole.some(p => msg.includes(p))) originalConsoleLog.apply(console, args);
};
console.error = (...args) => {
  const msg = args.map(a => typeof a === 'string' ? a : typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ').toLowerCase();
  if (!forbiddenPatternsConsole.some(p => msg.includes(p))) originalConsoleError.apply(console, args);
};

// 5. Memory store (unchanged)
const store = {
  messages: new Map(),
  maxPerChat: 20,
  bind(ev) {
    ev.on('messages.upsert', ({ messages }) => {
      for (const msg of messages) {
        if (!msg.key?.id) continue;
        const jid = msg.key.remoteJid;
        if (!store.messages.has(jid)) store.messages.set(jid, new Map());
        const chatMsgs = store.messages.get(jid);
        chatMsgs.set(msg.key.id, msg);
        while (chatMsgs.size > store.maxPerChat) {
          const oldestKey = chatMsgs.keys().next().value;
          chatMsgs.delete(oldestKey);
        }
      }
    });
  },
  loadMessage: async (jid, id) => store.messages.get(jid)?.get(id) || null
};

const processedMessages = new Set();
setInterval(() => processedMessages.clear(), 5 * 60 * 1000);

// 6. Suppressed logger for Baileys
function createSuppressedLogger(level = 'silent') {
  const forbidden = [...forbiddenPatternsConsole, 'ratchetkey', 'prekey', 'session'];
  let logger;
  try {
    logger = pino({ level,
      transport: process.env.NODE_ENV === 'production' ? undefined : {
        target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' }
      },
      customLevels: { trace: 0, debug: 1, info: 2, warn: 3, error: 4, fatal: 5 },
      redact: ['registrationId', 'ephemeralKeyPair', 'rootKey', 'chainKey', 'baseKey']
    });
  } catch (err) { logger = pino({ level }); }

  const originalInfo = logger.info.bind(logger);
  logger.info = (...args) => {
    const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ').toLowerCase();
    if (!forbidden.some(p => msg.includes(p))) originalInfo(...args);
  };
  logger.debug = () => {};
  logger.trace = () => {};
  return logger;
}

// 7. Session loader (KnightBot format)
function loadSessionFromEnv() {
  const sessionID = config.sessionID;
  if (!sessionID || !sessionID.startsWith('KnightBot!')) return false;
  try {
    const [header, b64data] = sessionID.split('!');
    if (header !== 'KnightBot' || !b64data) throw new Error('Invalid format');
    const cleanB64 = b64data.replace(/\.{3}$/, '');
    const compressed = Buffer.from(cleanB64, 'base64');
    const decompressed = zlib.gunzipSync(compressed);
    const folder = `./${config.sessionName || 'session'}`;
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'creds.json'), decompressed, 'utf8');
    console.log('📡 Session loaded from SESSION_ID');
    return true;
  } catch (e) {
    console.error('❌ Failed to decode session:', e.message);
    return false;
  }
}

// 8. Bot start
async function startBot() {
  // Load session (exits if missing)
  if (!loadSessionFromEnv()) {
    console.error('No valid SESSION_ID – add it in your hosting secrets and restart.');
    process.exit(1);
  }

  const { state, saveCreds } = await useMultiFileAuthState(`./${config.sessionName || 'session'}`);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    logger: createSuppressedLogger('silent'),
    printQRInTerminal: false,            // no QR
    browser: ['Chrome', 'Windows', '10.0'],
    auth: state,
    syncFullHistory: false,
    downloadHistory: false,
    markOnlineOnConnect: false,
    getMessage: async () => undefined
  });

  store.bind(sock.ev);

  // Watchdog (30min inactivity)
  let lastActivity = Date.now();
  sock.ev.on('messages.upsert', () => { lastActivity = Date.now(); });
  const watchdogInterval = setInterval(() => {
    if (Date.now() - lastActivity > 30 * 60 * 1000 && sock.ws && sock.ws.readyState === 1) {
      console.log('⚠️ Inactivity detected – forcing reconnect…');
      sock.end();
      clearInterval(watchdogInterval);
      setTimeout(startBot, 5000);
    }
  }, 5 * 60 * 1000);

  // Connection update handler
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      clearInterval(watchdogInterval);
      console.log('✅ Bot connected successfully!');
      console.log(`📱 Bot Number: ${sock.user.id.split(':')[0]}`);
      console.log(`🤖 Bot Name: ${config.botName}`);
      console.log(`⚡ Prefix: ${config.prefix}`);
      const ownerNames = Array.isArray(config.ownerName) ? config.ownerName.join(',') : config.ownerName;
      console.log(`👑 Owner: ${ownerNames}\n`);

      if (config.autoBio) {
        await sock.updateProfileStatus(`${config.botName} | Active 24/7`);
      }
      handler.initializeAntiCall(sock);

      // Store cleanup
      const now = Date.now();
      for (const [jid, chatMsgs] of store.messages.entries()) {
        const timestamps = Array.from(chatMsgs.values()).map(m => m.messageTimestamp * 1000 || 0);
        if (timestamps.length > 0 && now - Math.max(...timestamps) > 24 * 60 * 60 * 1000) {
          store.messages.delete(jid);
        }
      }
    } else if (connection === 'close') {
      clearInterval(watchdogInterval);
      const shouldReconnect = (lastDisconnect?.error?.output?.statusCode) !== DisconnectReason.loggedOut;
      const status = lastDisconnect?.error?.output?.statusCode;
      console.log(`🔁 Connection closed (${status}). Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) {
        setTimeout(startBot, 5000);
      } else {
        console.error('⛔ Logged out – update your SESSION_ID and restart.');
        // We don't exit, so Express keeps running and you can fix the secret
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // System JID filter
  const isSystemJid = (jid) => {
    if (!jid) return true;
    return jid.includes('@broadcast') || jid.includes('@newsletter') || jid.includes('status.broadcast');
  };

  // Message handler
  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message || !msg.key?.id) continue;
      const from = msg.key.remoteJid;
      if (!from || isSystemJid(from)) continue;
      if (processedMessages.has(msg.key.id)) continue;

      const msgAge = Date.now() - (msg.messageTimestamp * 1000 || 0);
      if (msgAge > 5 * 60 * 1000) continue;

      processedMessages.add(msg.key.id);

      handler.handleMessage(sock, msg).catch(err => {
        if (!err.message?.includes('rate-overlimit')) console.error('Handler error:', err.message);
      });

      // Auto-read and antilink in background
      setImmediate(async () => {
        if (config.autoRead && from.endsWith('@g.us')) {
          try { await sock.readMessages([msg.key]); } catch (e) {}
        }
        if (from.endsWith('@g.us')) {
          try {
            const gm = await handler.getGroupMetadata(sock, from);
            if (gm) await handler.handleAntilink(sock, msg, gm);
          } catch (e) {}
        }
      });
    }
  });

  // Group participant updates
  sock.ev.on('group-participants.update', (update) => {
    handler.handleGroupUpdate(sock, update).catch(() => {});
  });

  return sock;
}

// Start the bot
console.log('🚀 Starting WhatsApp MD Bot...\n');
console.log(`📦 Bot Name: ${config.botName}`);
console.log(`⚡ Prefix: ${config.prefix}`);
const ownerNames = Array.isArray(config.ownerName) ? config.ownerName.join(',') : config.ownerName;
console.log(`👑 Owner: ${ownerNames}\n`);

startBot().catch(err => {
  console.error('Fatal error:', err);
  // Don't exit if we're on Hugging Face – the Express server keeps the Space alive
});

// Global error handlers
process.on('uncaughtException', (err) => {
  if (err.code === 'ENOSPC' || err.message?.includes('no space')) return;
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (err) => {
  if (err.code === 'ENOSPC' || err.message?.includes('no space')) return;
  if (err.message?.includes('rate-overlimit')) return;
  console.error('Unhandled Rejection:', err);
});
