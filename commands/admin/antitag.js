/**
 * AntiTag Command
 * Enable/disable anti-tag and set action (delete/kick)
 */

const database = require('../../database');

module.exports = {
  name: 'antitag',
  aliases: ['antimention', 'at'],
  description: 'Configure anti-tag protection (tagall/hidetag)',
  usage: '.antitag <on/off/set/get>',
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  botAdminNeeded: true,

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    try {
      if (!args[0]) {
        const settings = database.getGroupSettings(from);
        const status = settings.antitag ? 'ON' : 'OFF';
        const action = settings.antitagAction || 'delete';
        return reply(
          `📛 Anti-tag is *${status}* (action: *${action}*).\n` +
          'Usage:\n' +
          '  .antitag on\n' +
          '  .antitag off\n' +
          '  .antitag set delete | kick\n' +
          '  .antitag get'
        );
      }

      const opt = args[0].toLowerCase();

      if (opt === 'on') {
        if (database.getGroupSettings(from).antitag) {
          return reply('*Antitag is already on*');
        }
        database.updateGroupSettings(from, { antitag: true });
        return reply('*Antitag has been turned ON*');
      }

      if (opt === 'off') {
        database.updateGroupSettings(from, { antitag: false });
        return reply('*Antitag has been turned OFF*');
      }

      if (opt === 'set') {
        if (args.length < 2) {
          return reply('*Please specify an action: .antitag set delete | kick*');
        }

        const setAction = args[1].toLowerCase();
        if (!['delete', 'kick'].includes(setAction)) {
          return reply('*Invalid action. Choose delete or kick.*');
        }

        database.updateGroupSettings(from, {
          antitagAction: setAction,
          antitag: true // Auto-enable when setting action
        });
        return reply(`*Antitag action set to ${setAction}*`);
      }

      if (opt === 'get') {
        const settings = database.getGroupSettings(from);
        const status = settings.antitag ? 'ON' : 'OFF';
        const action = settings.antitagAction || 'delete';
        return reply(`*Antitag Configuration:*\nStatus: ${status}\nAction: ${action}`);
      }

      return reply('*Use .antitag for usage.*');

    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  }
};
