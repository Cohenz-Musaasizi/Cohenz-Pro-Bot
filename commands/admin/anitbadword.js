// commands/admin/antibadword.js
const database = require('../../database');
const config = require('../../config');

module.exports = {
  name: 'antibadword',
  aliases: ['antiprofanity', 'filterbadwords'],
  category: 'admin',
  description: 'Toggle the anti‑badword filter (deletes messages containing foul language)',
  usage: '.antibadword on / .antibadword off',

  async execute(sock, msg, args, context) {
    const { from, sender, isGroup, reply, isOwner } = context;

    if (!isGroup) return reply('❌ This command can only be used in a group.');
    if (!isOwner) return reply('👑 Only the bot owner can toggle the anti‑badword filter.');

    const action = args[0]?.toLowerCase();
    if (!action || (action !== 'on' && action !== 'off')) {
      return reply('❌ Usage: .antibadword on / .antibadword off');
    }

    const settings = database.getGroupSettings(from);
    settings.antibadword = action === 'on';
    database.updateGroupSettings(from, settings);

    return reply(`✅ Anti‑badword filter is now ${settings.antibadword ? 'ON' : 'OFF'}.`);
  }
};
