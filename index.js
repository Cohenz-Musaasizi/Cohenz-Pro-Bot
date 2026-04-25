/**
 * WhatsApp Bot - Stable HF Version
 */

const fs = require('fs');
const pino = require('pino');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const config = require('./config');
const handler = require('./handler');

const sessionFolder = '/data/session';

if (!fs.existsSync(sessionFolder)) {
  fs.mkdirSync(sessionFolder, { recursive: true });
  console.log('📁 Session folder created');
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['Chrome', 'Windows', '10.0'],
    auth: state,
    syncFullHistory: false,
    connectTimeoutMs: 120000,
    defaultQueryTimeoutMs: 120000,
  });

  const ownerNumber = '256709913725';
  const ownerJid = `${ownerNumber}@s.whatsapp.net`;
  let pairingRequested = false;

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'connecting' && !pairingRequested) {
      pairingRequested = true;
      console.log('🔑 Requesting pairing code...');

      await new Promise(r => setTimeout(r, 12000)); // Long delay

      try {
        const code = await sock.requestPairingCode(ownerNumber);
        const formatted = code?.match(/.{1,4}/g)?.join('-') || code;

        console.log(`\n✅ PAIRING CODE: ${formatted}`);

        await sock.sendMessage(ownerJid, {
          text: `🔑 *Cohenz Pro Bot* Pairing Code\n\n` +
                `*Code:* ${formatted}\n\n` +
                `If stuck:\n1. Cancel "Logging in"\n2. Linked Devices → Link with phone number\n3. Paste new code`
        });
      } catch (err) {
        console.error('Pairing failed:', err.message);
      }
    }

    if (connection === 'open') {
      console.log('\n✅ Bot connected successfully!');
      await sock.sendMessage(ownerJid, { text: '✅ Bot is Online! Send .menu to test' });
    }

    if (connection === 'close') {
      console.log('Connection closed, reconnecting...');
      setTimeout(startBot, 10000);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // Basic message handler
  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (msg.message) handler.handleMessage(sock, msg).catch(() => {});
    }
  });

  return sock;
}

console.log('🚀 Starting Cohenz Pro Bot on Hugging Face...');
startBot().catch(err => console.error('Error:', err));