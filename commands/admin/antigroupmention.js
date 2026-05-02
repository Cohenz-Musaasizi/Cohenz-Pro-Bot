/**
 * Anti-Group Mention Command - Toggle antigroupmention protection with delete/kick options
 */

const database = require('../../database');

module.exports = {
  name: 'antigroupmention',
  aliases: ['agm'],
  category: 'admin',
  description: 'Configure antigroupmention protection (delete/kick)',
  usage: '.antigroupmention <on/off/set/get>',
  groupOnly: true,
  adminOnly: true,
  botAdminNeeded: true,

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    try {
      if (!args[0]) {
        const settings = database.getGroupSettings(from);
        const status = settings.antigroupmention ? 'ON' : 'OFF';
        const action = settings.antigroupmentionAction || 'delete';
        return reply(
          `📌 *Antigroupmention Status*\n\n` +
          `Status: *${status}*\n` +
          `Action: *${action}*\n\n` +
          `Usage:\n` +
          `  .antigroupmention on\n` +
          `  .antigroupmention off\n` +
          `  .antigroupmention set delete | kick\n` +
          `  .antigroupmention get`
        );
      }

      const opt = args[0].toLowerCase();

      if (opt === 'on') {
        if (database.getGroupSettings(from).antigroupmention) {
          return reply('*Antigroupmention is already on*');
        }
        database.updateGroupSettings(from, { antigroupmention: true });
        return reply('*Antigroupmention has been turned ON*');
      }

      if (opt === 'off') {
        database.updateGroupSettings(from, { antigroupmention: false });
        return reply('*Antigroupmention has been turned OFF*');
      }

      if (opt === 'set') {
        if (args.length < 2) {
          return reply('*Please specify an action: .antigroupmention set delete | kick*');
        }

        const setAction = args[1].toLowerCase();
        if (!['delete', 'kick'].includes(setAction)) {
          return reply('*Invalid action. Choose delete or kick.*');
        }

        database.updateGroupSettings(from, {
          antigroupmentionAction: setAction,
          antigroupmention: true // Auto-enable when setting action
        });
        return reply(`*Antigroupmention action set to ${setAction}*`);
      }

      if (opt === 'get') {
        const settings = database.getGroupSettings(from);
        const status = settings.antigroupmention ? 'ON' : 'OFF';
        const action = settings.antigroupmentionAction || 'delete';
        return reply(`*Antigroupmention Configuration:*\nStatus: ${status}\nAction: ${action}`);
      }

      return reply('*Use .antigroupmention for usage.*');

    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  }
};
