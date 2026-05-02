/**
 * AutoSticker Command - Enable or disable auto-sticker conversion
 */

const database = require('../../database');

module.exports = {
  name: 'autosticker',
  aliases: ['autos', 'asticker'],
  category: 'admin',
  description: 'Enable or disable auto-sticker conversion (images/videos automatically become stickers)',
  usage: '.autosticker <on/off>',
  groupOnly: true,
  adminOnly: true,
  botAdminNeeded: false,
  
  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    try {
      if (!args[0]) {
        const settings = database.getGroupSettings(from);
        const status = settings.autosticker ? 'ON' : 'OFF';
        return reply(
          `📌 *AutoSticker Status*\n\n` +
          `Status: *${status}*\n\n` +
          `When enabled, all images and videos sent in this group will automatically be converted to stickers.\n\n` +
          `Usage:\n` +
          `  .autosticker on\n` +
          `  .autosticker off`
        );
      }
      
      const opt = args[0].toLowerCase();
      
      if (opt === 'on') {
        if (database.getGroupSettings(from).autosticker) {
          return reply('*AutoSticker is already ON*');
        }
        database.updateGroupSettings(from, { autosticker: true });
        return reply('✅ *AutoSticker has been turned ON*\n\nAll images and videos will now automatically be converted to stickers!');
      }
      
      if (opt === 'off') {
        if (!database.getGroupSettings(from).autosticker) {
          return reply('*AutoSticker is already OFF*');
        }
        database.updateGroupSettings(from, { autosticker: false });
        return reply('❌ *AutoSticker has been turned OFF*');
      }
      
      return reply('❌ Invalid option!\nUsage: .autosticker <on/off>');
    } catch (error) {
      console.error('[AutoSticker Command Error]:', error);
      return reply('❌ Error updating autosticker setting.');
    }
  }
};
