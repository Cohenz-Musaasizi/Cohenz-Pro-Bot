// commands/ai/chatbot.js
const database = require('../../database');
const config = require('../../config');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'chatbot',
  aliases: ['autoreply'],
  category: 'ai',
  description: 'Toggle AI chatbot replies (uses Gemini)',
  usage: '.chatbot on / .chatbot off',

  async execute(sock, msg, args, context) {
    const { from, sender, isGroup, reply, isOwner, isAdmin } = context;
    const action = args[0]?.toLowerCase();
    if (!action || (action !== 'on' && action !== 'off')) {
      return reply('❌ Usage: .chatbot on / .chatbot off');
    }

    const enable = action === 'on';

    if (isGroup) {
      if (!isAdmin && !isOwner) {
        return reply('❌ Only group admins or owner can toggle chatbot.');
      }
      const settings = database.getGroupSettings(from);
      settings.chatbot = enable;
      database.updateGroupSettings(from, settings);
      return reply(`✅ Chatbot ${enable ? 'enabled' : 'disabled'} for this group.`);
    } else {
      const privateSettingsPath = path.join(__dirname, '..', '..', 'private_chatbot.json');
      let privateSettings = {};
      try { privateSettings = JSON.parse(fs.readFileSync(privateSettingsPath, 'utf8')); } catch {}
      privateSettings[from] = enable;
      fs.writeFileSync(privateSettingsPath, JSON.stringify(privateSettings, null, 2));
      return reply(`✅ Chatbot ${enable ? 'enabled' : 'disabled'} for this private chat.`);
    }
  }
};
