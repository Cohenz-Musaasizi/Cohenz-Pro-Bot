/**
 * Message Handler - Processes incoming messages and executes commands
 */

const config = require('./config');
const database = require('./database');
const { loadCommands } = require('./utils/commandLoader');
const { addMessage } = require('./utils/groupstats');
const { jidDecode, jidEncode } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Group metadata cache to prevent rate limiting
const groupMetadataCache = new Map();
const CACHE_TTL = 60000; // 1 minute cache

// Load all commands
const commands = loadCommands();

// Unwrap WhatsApp containers (ephemeral, view once, etc.)
const getMessageContent = (msg) => {
  if (!msg || !msg.message) return null;
  
  let m = msg.message;
  
  // Common wrappers in modern WhatsApp
  if (m.ephemeralMessage) m = m.ephemeralMessage.message;
  if (m.viewOnceMessageV2) m = m.viewOnceMessageV2.message;
  if (m.viewOnceMessage) m = m.viewOnceMessage.message;
  if (m.documentWithCaptionMessage) m = m.documentWithCaptionMessage.message;
  
  return m;
};

// Cached group metadata getter with rate limit handling (for non-admin checks)
const getCachedGroupMetadata = async (sock, groupId) => {
  try {
    if (!groupId || !groupId.endsWith('@g.us')) return null;
    
    const cached = groupMetadataCache.get(groupId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    
    const metadata = await sock.groupMetadata(groupId);
    groupMetadataCache.set(groupId, { data: metadata, timestamp: Date.now() });
    return metadata;
  } catch (error) {
    if (error.message && (
      error.message.includes('forbidden') || 
      error.message.includes('403') ||
      error.statusCode === 403 ||
      error.output?.statusCode === 403 ||
      error.data === 403
    )) {
      groupMetadataCache.set(groupId, { data: null, timestamp: Date.now() });
      return null;
    }
    if (error.message && error.message.includes('rate-overlimit')) {
      const cached = groupMetadataCache.get(groupId);
      return cached ? cached.data : null;
    }
    const cached = groupMetadataCache.get(groupId);
    return cached ? cached.data : null;
  }
};

// Live group metadata getter (always fresh, no cache) - for admin checks
const getLiveGroupMetadata = async (sock, groupId) => {
  try {
    const metadata = await sock.groupMetadata(groupId);
    groupMetadataCache.set(groupId, { data: metadata, timestamp: Date.now() });
    return metadata;
  } catch (error) {
    const cached = groupMetadataCache.get(groupId);
    return cached ? cached.data : null;
  }
};

const getGroupMetadata = getCachedGroupMetadata;

// Helper functions
const normalizeJid = (jid) => {
  if (!jid) return null;
  if (typeof jid !== 'string') return null;
  if (jid.includes(':')) return jid.split(':')[0];
  if (jid.includes('@')) return jid.split('@')[0];
  return jid;
};

const isOwner = (sender) => {
  if (!sender) return false;
  const normalizedSender = normalizeJid(sender);
  return config.ownerNumber.some(owner => {
    const normalizedOwner = normalizeJid(owner.includes('@') ? owner : `${owner}@s.whatsapp.net`);
    return normalizedOwner === normalizedSender;
  });
};

const isMod = (sender) => {
  const number = sender.split('@')[0];
  return database.isModerator(number);
};

// LID mapping cache
const lidMappingCache = new Map();
const getLidMappingValue = (user, direction) => {
  if (!user) return null;
  const cacheKey = `${direction}:${user}`;
  if (lidMappingCache.has(cacheKey)) return lidMappingCache.get(cacheKey);
  const sessionPath = path.join(__dirname, config.sessionName || 'session');
  const suffix = direction === 'pnToLid' ? '.json' : '_reverse.json';
  const filePath = path.join(sessionPath, `lid-mapping-${user}${suffix}`);
  if (!fs.existsSync(filePath)) {
    lidMappingCache.set(cacheKey, null);
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    const value = raw ? JSON.parse(raw) : null;
    lidMappingCache.set(cacheKey, value || null);
    return value || null;
  } catch (error) {
    lidMappingCache.set(cacheKey, null);
    return null;
  }
};

const normalizeJidWithLid = (jid) => {
  if (!jid) return jid;
  try {
    const decoded = jidDecode(jid);
    if (!decoded?.user) return `${jid.split(':')[0].split('@')[0]}@s.whatsapp.net`;
    let user = decoded.user;
    let server = decoded.server === 'c.us' ? 's.whatsapp.net' : decoded.server;
    const mapToPn = () => {
      const pnUser = getLidMappingValue(user, 'lidToPn');
      if (pnUser) {
        user = pnUser;
        server = server === 'hosted.lid' ? 'hosted' : 's.whatsapp.net';
        return true;
      }
      return false;
    };
    if (server === 'lid' || server === 'hosted.lid') mapToPn();
    else if (server === 's.whatsapp.net' || server === 'hosted') mapToPn();
    if (server === 'hosted') return jidEncode(user, 'hosted');
    return jidEncode(user, 's.whatsapp.net');
  } catch (error) {
    return jid;
  }
};

const buildComparableIds = (jid) => {
  if (!jid) return [];
  try {
    const decoded = jidDecode(jid);
    if (!decoded?.user) return [normalizeJidWithLid(jid)].filter(Boolean);
    const variants = new Set();
    const normalizedServer = decoded.server === 'c.us' ? 's.whatsapp.net' : decoded.server;
    variants.add(jidEncode(decoded.user, normalizedServer));
    const isPnServer = normalizedServer === 's.whatsapp.net' || normalizedServer === 'hosted';
    const isLidServer = normalizedServer === 'lid' || normalizedServer === 'hosted.lid';
    if (isPnServer) {
      const lidUser = getLidMappingValue(decoded.user, 'pnToLid');
      if (lidUser) {
        const lidServer = normalizedServer === 'hosted' ? 'hosted.lid' : 'lid';
        variants.add(jidEncode(lidUser, lidServer));
      }
    } else if (isLidServer) {
      const pnUser = getLidMappingValue(decoded.user, 'lidToPn');
      if (pnUser) {
        const pnServer = normalizedServer === 'hosted.lid' ? 'hosted' : 's.whatsapp.net';
        variants.add(jidEncode(pnUser, pnServer));
      }
    }
    return Array.from(variants);
  } catch (error) {
    return [jid];
  }
};

const findParticipant = (participants = [], userIds) => {
  const targets = (Array.isArray(userIds) ? userIds : [userIds])
    .filter(Boolean)
    .flatMap(id => buildComparableIds(id));
  if (!targets.length) return null;
  return participants.find(participant => {
    if (!participant) return false;
    const participantIds = [participant.id, participant.lid, participant.userJid]
      .filter(Boolean)
      .flatMap(id => buildComparableIds(id));
    return participantIds.some(id => targets.includes(id));
  }) || null;
};

const isAdmin = async (sock, participant, groupId, groupMetadata = null) => {
  if (!participant || !groupId || !groupId.endsWith('@g.us')) return false;
  let liveMetadata = groupMetadata;
  if (!liveMetadata || !liveMetadata.participants) {
    liveMetadata = await getLiveGroupMetadata(sock, groupId);
  }
  if (!liveMetadata || !liveMetadata.participants) return false;
  const foundParticipant = findParticipant(liveMetadata.participants, participant);
  if (!foundParticipant) return false;
  return foundParticipant.admin === 'admin' || foundParticipant.admin === 'superadmin';
};

const isBotAdmin = async (sock, groupId, groupMetadata = null) => {
  if (!sock.user?.id || !groupId?.endsWith('@g.us')) return false;
  const botId = sock.user.id;
  const botLid = sock.user.lid;
  if (!botId) return false;
  const botJids = [botId];
  if (botLid) botJids.push(botLid);
  const liveMetadata = await getLiveGroupMetadata(sock, groupId);
  if (!liveMetadata || !liveMetadata.participants) return false;
  const participant = findParticipant(liveMetadata.participants, botJids);
  if (!participant) return false;
  return participant.admin === 'admin' || participant.admin === 'superadmin';
};

const isUrl = (text) => /(https?:\/\/[^\s]+)/gi.test(text);
const hasGroupLink = (text) => /chat.whatsapp.com\/([0-9A-Za-z]{20,24})/i.test(text);

const isSystemJid = (jid) => {
  if (!jid) return true;
  return jid.includes('@broadcast') || jid.includes('status.broadcast') || jid.includes('@newsletter') || jid.includes('@newsletter.');
};

// Placeholder for missing group handlers (you can expand later)
const handleAntigroupmention = async (sock, msg, groupMetadata) => {};
const handleAntilink = async (sock, msg, groupMetadata) => {};

// ══════════════════════════════════════════════════════════════
// MAIN MESSAGE HANDLER
// ══════════════════════════════════════════════════════════════
const handleMessage = async (sock, msg) => {
  try {
    if (!msg.message) return;
    
    const from = msg.key.remoteJid;
    if (isSystemJid(from)) return;

    // Auto‑React system (unchanged)
    try {
      delete require.cache[require.resolve('./config')];
      const freshConfig = require('./config');
      if (freshConfig.autoReact && msg.message && !msg.key.fromMe) {
        const content = msg.message.ephemeralMessage?.message || msg.message;
        const text = content.conversation || content.extendedTextMessage?.text || '';
        const jid = msg.key.remoteJid;
        const emojis = ['❤️','🔥','👌','💀','😁','✨','👍','🤨','😎','😂','🤝','💫'];
        const mode = freshConfig.autoReactMode || 'bot';
        if (mode === 'bot') {
          const prefixList = ['.', '/', '#'];
          if (prefixList.includes(text?.trim()[0])) {
            await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });
          }
        }
        if (mode === 'all') {
          await sock.sendMessage(jid, { react: { text: emojis[Math.floor(Math.random() * emojis.length)], key: msg.key } });
        }
      }
    } catch (e) { /* ignore */ }

    const content = getMessageContent(msg);
    if (!content) return;

    const sender = msg.key.fromMe ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : msg.key.participant || msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const groupMetadata = isGroup ? await getGroupMetadata(sock, from) : null;

    // Track group stats
    if (isGroup) addMessage(from, sender);

    // Button responses (unchanged)
    const btn = content.buttonsResponseMessage || msg.message?.buttonsResponseMessage;
    if (btn) {
      const buttonId = btn.selectedButtonId;
      const cmd = commands.get(buttonId.replace('btn_', ''));
      if (cmd) {
        const context = {
          from, sender, isGroup, groupMetadata,
          isOwner: isOwner(sender),
          isAdmin: await isAdmin(sock, sender, from, groupMetadata),
          isBotAdmin: await isBotAdmin(sock, from, groupMetadata),
          isMod: isMod(sender),
          reply: (text) => sock.sendMessage(from, { text }, { quoted: msg }),
          react: (emoji) => sock.sendMessage(from, { react: { text: emoji, key: msg.key } })
        };
        await cmd.execute(sock, msg, [], context).catch(err => console.error('Button cmd error:', err));
      }
      return;
    }

    // Extract text body
    let body = '';
    if (content.conversation) body = content.conversation;
    else if (content.extendedTextMessage) body = content.extendedTextMessage.text || '';
    else if (content.imageMessage) body = content.imageMessage.caption || '';
    else if (content.videoMessage) body = content.videoMessage.caption || '';
    body = body.trim();

    // ── CHATBOT (Owner‑only toggle, per‑chat, AI reply using Gemini) ──
    if (!body.startsWith(config.prefix) && body.length > 0) {
      let chatbotEnabled = false;

      if (isGroup) {
        const gs = database.getGroupSettings(from);
        chatbotEnabled = gs.chatbot === true;
      } else {
        const privateSettingsPath = path.join(__dirname, 'private_chatbot.json');
        try {
          const privateSettings = JSON.parse(fs.readFileSync(privateSettingsPath, 'utf8'));
          chatbotEnabled = privateSettings[from] === true;
        } catch {}
      }

      if (chatbotEnabled) {
        try {
          await sock.sendPresenceUpdate('composing', from);
          const APIs = require('./utils/api');
          const response = await APIs.gemini(body, from);
          await sock.sendMessage(from, { text: response }, { quoted: msg });
        } catch (err) {
          console.error('Chatbot error:', err);
          await sock.sendMessage(from, { text: '❌ Chatbot error.' }, { quoted: msg });
        } finally {
          await sock.sendPresenceUpdate('paused', from);
        }
        return;
      }
    }

    // Check prefix for commands
    if (!body.startsWith(config.prefix)) return;

    const args = body.slice(config.prefix.length).trim().split(/ +/);
    const cmdName = args.shift().toLowerCase();
    const command = commands.get(cmdName);
    if (!command) return;

    // ── OWNER‑ONLY CHATBOT TOGGLE ──
    if (cmdName === 'chatbot') {
      const action = args[0]?.toLowerCase();
      if (!action || (action !== 'on' && action !== 'off')) {
        return sock.sendMessage(from, { text: '❌ Usage: .chatbot on / .chatbot off' }, { quoted: msg });
      }

      if (!isOwner(sender)) {
        return sock.sendMessage(from, { text: '👑 Only the bot owner can toggle the chatbot.' }, { quoted: msg });
      }

      const enable = action === 'on';

      if (isGroup) {
        const settings = database.getGroupSettings(from);
        settings.chatbot = enable;
        database.updateGroupSettings(from, settings);
      } else {
        const privateSettingsPath = path.join(__dirname, 'private_chatbot.json');
        let privateSettings = {};
        try {
          privateSettings = JSON.parse(fs.readFileSync(privateSettingsPath, 'utf8'));
        } catch {}
        privateSettings[from] = enable;
        fs.writeFileSync(privateSettingsPath, JSON.stringify(privateSettings, null, 2));
      }

      return sock.sendMessage(from, { text: `✅ Chatbot ${enable ? 'enabled' : 'disabled'} for this chat.` }, { quoted: msg });
    }

    const context = {
      from,
      sender,
      isGroup,
      groupMetadata,
      isOwner: isOwner(sender),
      isAdmin: await isAdmin(sock, sender, from, groupMetadata),
      isBotAdmin: await isBotAdmin(sock, from, groupMetadata),
      isMod: isMod(sender),
      reply: (text) => sock.sendMessage(from, { text }, { quoted: msg }),
      react: (emoji) => sock.sendMessage(from, { react: { text: emoji, key: msg.key } })
    };

    // Execute command with error catching
    try {
      await command.execute(sock, msg, args, context);
    } catch (err) {
      console.error(`💥 Command "${cmdName}" crashed:`, err.message);
      await sock.sendMessage(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
    }

  } catch (error) {
    console.error('Handler global error:', error.message);
  }
};

// ─── Exports ────────────────────────────────────────────────
module.exports = {
  handleMessage,
  getGroupMetadata,
  initializeAntiCall: (sock) => {}, // stub
  handleGroupUpdate: async (sock, update) => {}, // stub
  handleAntilink,
  handleAntigroupmention
};

console.log(`✅ Handler loaded successfully with ${commands.size} commands`);
