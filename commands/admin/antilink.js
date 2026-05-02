/**
 * Antilink Command - Toggle antilink protection with delete/kick options
 */

const database = require('../../database');

module.exports = {
  name: 'antilink',
  aliases: [],
  category: 'admin',
  description: 'Configure antilink protection (delete/kick)',
  usage: '.antilink <on/off/set/get>',
  groupOnly: true,
  adminOnly: true,
  botAdminNeeded: true,

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    try {
      if (!args[0]) {
        const settings = database.getGroupSettings(from);
        const status = settings.antilink ? 'ON' : 'OFF';
        const action = settings.antilinkAction || 'delete';
        return reply(
          `🔗 *Antilink Status*\n\n` +
          `Status: *${status}*\n` +
          `Action: *${action}*\n\n` +
          `Usage:\n` +
          `  .antilink on\n` +
          `  .antilink off\n` +
          `  .antilink set delete | kick\n` +
          `  .antilink get`
        );
      }

      const opt = args[0].toLowerCase();

      if (opt === 'on') {
        if (database.getGroupSettings(from).antilink) {
          return reply('*Antilink is already on*');
        }
        database.updateGroupSettings(from, { antilink: true });
        return reply('*Antilink has been turned ON*');
      }

      if (opt === 'off') {
        database.updateGroupSettings(from, { antilink: false });
        return reply('*Antilink has been turned OFF*');
      }

      if (opt === 'set') {
        if (args.length < 2) {
          return reply('*Please specify an action: .antilink set delete | kick*');
        }

        const setAction = args[1].toLowerCase();
        if (!['delete', 'kick'].includes(setAction)) {
          return reply('*Invalid action. Choose delete or kick.*');
        }

        database.updateGroupSettings(from, {
          antilinkAction: setAction,
          antilink: true // Auto-enable when setting action
        });
        return reply(`*Antilink action set to ${setAction}*`);
      }

      if (opt === 'get') {
        const settings = database.getGroupSettings(from);
        const status = settings.antilink ? 'ON' : 'OFF';
        const action = settings.antilinkAction || 'delete';
        return reply(`*Antilink Configuration:*\nStatus: ${status}\nAction: ${action}`);
      }

      return reply('*Use .antilink for usage.*');

    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  }
};
