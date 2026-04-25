/**
 * WhatsApp MD Bot - Main Entry Point (Hugging Face Pairing Code Version)
 */
process.env.PUPPETEER_SKIP_DOWNLOAD = 'true';
process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';
process.env.PUPPETEER_CACHE_DIR = process.env.PUPPETEER_CACHE_DIR || '/tmp/puppeteer_cache_disabled';

// ── Dummy mumaker creation (BEFORE any require that loads commands) ──
const fs = require('fs');
const path = require('path');
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

// ── Remove missing utils, just skip them ────────────────────────
// (commented out because they don't exist)
// const { initializeTempSystem } = require('./utils/tempManager');
// const { startCleanup } = require('./utils/cleanup');
// initializeTempSystem();
// startCleanup();

const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

const forbiddenPatternsConsole = [
  'closing session',
  'closing open session',
  'sessionentry',
  'prekey bundle',
  'pendingprekey',
  '_chains',
  'registrationid',
  'currentratchet',
  'chainkey',
  'ratchet',
  'signal protocol',
  'ephemeralkeypair',
  'indexinfo',
  'basekey'
];

console.log = (...args) => {
  const message = args.map(a => typeof a === 'string' ? a : typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ').toLowerCase();
  if (!forbiddenPatternsConsole.some(pattern => message.includes(pattern))) {
    originalConsoleLog.apply(console, args);
  }
};

console.error = (...args) => {
  const message = args.map(a => typeof a === 'string' ? a : typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ').toLowerCase();
  if (!forbiddenPatternsConsole.some(pattern => message.includes(pattern))) {
    originalConsoleError.apply(console, args);
  }
};

console.warn = (...args) => {
  const message = args.map(a => typeof a === 'string' ? a : typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ').toLowerCase();
  if (!forbiddenPatternsConsole.some(pattern => message.includes(pattern))) {
    originalConsoleWarn.apply(console, args);
  }
};

// Safe to load libraries
const pino = require('pino');
const express = require('express');                          // <-- NEW
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const config = require('./config');
const handler = require('./handler');
const zlib = require('zlib');
const os = require('os');

// ── Express app for web UI ────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

// Pairing code state
let currentCode = '';
let codeGenerated = false;
let botIsConnected = false;

app.get('/', (req, res) => {
  if (botIsConnected) {
    res.send(`<h2>✅ Bot is already connected!</h2>`);
  } else if (codeGenerated && currentCode) {
    const formatted = currentCode.match(/.{1,4}/g)?.join('-') || currentCode;
    res.send(`
      <html>
        <head><title>Link Device</title><meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: sans-serif; text-align: center; padding: 40px; }
          .code { font-size: 2.5rem; font-weight: bold; background: #e7ffdb; padding: 20px; border-radius: 15px; display: inline-block; margin: 20px; }
          button { background: #25D366; color: white; border: none; padding: 14px 30px; font-size: 1.1rem; border-radius: 30px; cursor: pointer; }
          .timer { color: red; font-weight: bold; }
        </style></head>
        <body>
          <h2>🔐 Your Pairing Code</h2>
          <div class="code">${formatted}</div><br>
          <button onclick="navigator.clipboard.writeText('${currentCode}');alert('Copied!')">📋 Copy Code</button>
          <p><b>1.</b> Open WhatsApp → Linked Devices → Link with phone number<br>
          <b>2.</b> Enter the code above<br>
          <b>3.</b> Tap Confirm</p>
          <p class="timer">⚠️ Code valid for 60 seconds</p>
          <script>setTimeout(() => location.reload(), 55000);</script>
        </body>
      </html>`);
  } else {
    res.send(`<h2>⏳ Generating pairing code...</h2><script>setTimeout(() => location.reload(), 3000);</script>`);
  }
});

// Remove Puppeteer cache
function cleanupPuppeteerCache() {
  try {
    const home = os.homedir();
    const cacheDir = path.join(home, '.cache', 'puppeteer');
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
      console.log('✅ Puppeteer cache removed');
    }
  } catch (err) {}
}

// In-memory store
const store = {
  messages: new Map(),
  maxPerChat: 20,
  bind: (ev) => {
    ev.on('messages.upsert', ({ messages }) => {
      for (const msg of messages) {
        if (!msg.key?.id) continue;
        const jid = msg.key.remoteJid;
        if (!store.messages.has(jid)) store.messages.set(jid, new Map());
        const chatMsgs = store.messages.get(jid);
        chatMsgs.set(msg.key.id, msg);
        if (chatMsgs.size > store.maxPerChat) {
          const oldest = chatMsgs.keys().next().value;
          chatMsgs.delete(oldest);
        }
      }
    });
  },
  loadMessage: async (jid, id) => store.messages.get(jid)?.get(id) || null
};

const processedMessages = new Set();
setInterval(() => processedMessages.clear(), 5 * 60 * 1000);

// ── Start Bot ─────────────────────────────────────────────────
async function startBot() {
  const sessionFolder = `./${config.sessionName}`;
  const sessionFile = path.join(sessionFolder, 'creds.json');

  // If KnightBot session ID exists, process it (unchanged)
  if (config.sessionID && config.sessionID.startsWith('KnightBot!')) {
    try {
      const [header, b64data] = config.sessionID.split('!');
      if (header !== 'KnightBot' || !b64data) throw new Error('Invalid session format');
      const cleanB64 = b64data.replace('...', '');
      const compressedData = Buffer.from(cleanB64, 'base64');
      const decompressedData = zlib.gunzipSync(compressedData);
      if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder, { recursive: true });
      fs.writeFileSync(sessionFile, decompressedData, 'utf8');
      console.log('📡 Session : 🔑 Retrieved from KnightBot Session');
    } catch (e) {
      console.error('📡 Session : ❌ Error processing KnightBot session:', e.message);
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

  store.bind(sock.ev);

  // Watchdog
  let lastActivity = Date.now();
  sock.ev.on('messages.upsert', () => lastActivity = Date.now());
  const watchdogInterval = setInterval(async () => {
    if (Date.now() - lastActivity > 30 * 60 * 1000 && sock.ws.readyState === 1) {
      console.log('⚠️ No activity detected. Forcing reconnect...');
      await sock.end(undefined, undefined, { reason: 'inactive' });
      clearInterval(watchdogInterval);
      setTimeout(() => startBot(), 5000);
    }
  }, 5 * 60 * 1000);

  // ── Connection update with Pairing Code ────────────────────
  let pairingRequested = false;
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    // Request pairing code when connecting
    if (connection === 'connecting' && !pairingRequested) {
      pairingRequested = true;
      try {
        const ownerNumber = config.ownerNumber.replace(/[^0-9]/g, '');
        const code = await sock.requestPairingCode(ownerNumber);
        currentCode = code;
        codeGenerated = true;
        console.log(`\n🔢 Pairing code: ${code}`);
        setTimeout(() => { codeGenerated = false; currentCode = ''; }, 60000);
      } catch (err) {
        console.error('❌ Failed to get pairing code:', err.message);
        pairingRequested = false;
      }
    }

    if (connection === 'open') {
      botIsConnected = true;
      currentCode = ''; codeGenerated = false;
      clearInterval(watchdogInterval);
      console.log('\n✅ Bot connected successfully!');
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
    }

    if (connection === 'close') {
      botIsConnected = false;
      pairingRequested = false;
      clearInterval(watchdogInterval);
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) setTimeout(() => startBot(), 3000);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // Message deduplication and processing (unchanged)
  const isSystemJid = (jid) => {
    if (!jid) return true;
    return jid.includes('@broadcast') || jid.includes('@newsletter');
  };

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message || !msg.key?.id) continue;
      const from = msg.key.remoteJid;
      if (!from || isSystemJid(from)) continue;
      const msgId = msg.key.id;
      if (processedMessages.has(msgId)) continue;
      const MESSAGE_AGE_LIMIT = 5 * 60 * 1000;
      let messageAge = 0;
      if (msg.messageTimestamp) {
        messageAge = Date.now() - (msg.messageTimestamp * 1000);
        if (messageAge > MESSAGE_AGE_LIMIT) continue;
      }
      processedMessages.add(msgId);

      // Store
      if (!store.messages.has(from)) store.messages.set(from, new Map());
      store.messages.get(from).set(msg.key.id, msg);

      handler.handleMessage(sock, msg).catch(err => {
        if (!err.message?.includes('rate-overlimit')) console.error('Error:', err.message);
      });

      setImmediate(async () => {
        if (config.autoRead && from.endsWith('@g.us')) {
          try { await sock.readMessages([msg.key]); } catch (e) {}
        }
      });
    }
  });

  // Group updates
  sock.ev.on('group-participants.update', async (update) => {
    await handler.handleGroupUpdate(sock, update);
  });

  return sock;
}

// ── Start everything ─────────────────────────────────────────
console.log('🚀 Starting WhatsApp MD Bot...\n');
cleanupPuppeteerCache();

// Start Express server then bot
app.listen(PORT, () => {
  console.log(`🌐 Web UI running on port ${PORT}`);
  startBot().catch(err => {
    console.error('Error starting bot:', err);
  });
});

// Process error handling (unchanged)
process.on('uncaughtException', (err) => {
  if (err.code === 'ENOSPC' || err.message?.includes('no space left')) {
    console.error('⚠️ No space left, attempting cleanup...');
    return;
  }
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (err) => {
  if (err.code === 'ENOSPC' || err.message?.includes('no space left')) return;
  if (err.message?.includes('rate-overlimit')) return;
  console.error('Unhandled Rejection:', err);
});
module.exports = { store };
