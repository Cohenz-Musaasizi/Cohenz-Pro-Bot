/**
 * WhatsApp Bot - Stable HF Version
 */

const fs = require('fs');
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
app.get('/', (req, res) => res.send('Bot running...'));

const sessionFolder = './session';

// Clean old session if any (prevents conflicts)
if (fs.existsSync(sessionFolder)) {
    fs.rmSync(sessionFolder, { recursive: true, force: true });
    console.log('🧹 Old session deleted');
}
fs.mkdirSync(sessionFolder, { recursive: true });

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'error' }),
        printQRInTerminal: false,
        browser: ['Chrome', 'Windows', '10.0'],
        auth: state,
        syncFullHistory: false,
        connectTimeoutMs: 120000,
        defaultQueryTimeoutMs: 3000,
    });

    // Get owner number from config (must be international, no +)
    const ownerNumber = config.ownerNumber.replace(/[^0-9]/g, '');
    const ownerJid = `${ownerNumber}@s.whatsapp.net`;

    // --- Request pairing code immediately ─────────────────
    try {
        const code = await sock.requestPairingCode(ownerNumber);
        const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
        console.log(`\n✅ PAIRING CODE: ${formattedCode}\n`);
        console.log('📲 Open WhatsApp → Linked Devices → Link with phone number');
    } catch (err) {
        console.error('❌ Failed to get pairing code:', err);
    }

    // Connection updates
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'connecting') {
            console.log('🔄 Connecting to WhatsApp...');
        }

        if (connection === 'open') {
            console.log('\n✅ Bot connected successfully!');
            await sock.sendMessage(ownerJid, { text: '✅ Bot is Online!' });
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log('❌ Connection closed. Reconnecting:', shouldReconnect);
            if (shouldReconnect) startBot();
        }
    });

    // Save credentials on update
    sock.ev.on('creds.update', saveCreds);

    // Message handler
    sock.ev.on('messages.upsert', ({ messages, type }) => {
        if (type !== 'notify') return;
        for (const msg of messages) {
            if (msg.message) handler.handleMessage(sock, msg).catch(() => {});
        }
    });

    return sock;
}

// Start the Express server first, then the bot
app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
    startBot().catch(err => {
        console.error('❌ Bot crashed:', err);
        setTimeout(startBot, 5000); // auto-restart after delay
    });
});
