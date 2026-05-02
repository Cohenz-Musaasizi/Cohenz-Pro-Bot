/**
 * Welcome - Enable/disable welcome messages
 */

const db = require('../../database');

module.exports = {
  name: 'welcome',
  aliases: ['welcomeon', 'welcomeoff'],
  category: 'admin',
  description: 'Enable/disable welcome messages',
  usage: '.welcome on/off',
  groupOnly: true,
  adminOnly: true,
  botAdminNeeded: true,

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    try {
      const action = args[0]?.toLowerCase();

      if (!action || !['on', 'off'].includes(action)) {
        const groupSettings = db.getGroupSettings(from);
        const status = groupSettings.welcome ? '✅ Enabled' : '❌ Disabled';
        return reply(
          `👋 *Welcome Messages*\n\nStatus: ${status}\nMessage: ${groupSettings.welcomeMessage}\n\nUsage: .welcome on/off\n\nTo customize: .setwelcome <message>`
        );
      }

      const enable = action === 'on';
      db.updateGroupSettings(from, { welcome: enable });

      await reply(
        `✅ Welcome messages ${enable ? 'enabled' : 'disabled'}!${enable ? '\n\nNew members will now receive welcome messages.' : ''}`
      );

    } catch (error) {
      console.error('Welcome Error:', error);
      await reply(`❌ Error: ${error.message}`);
    }
  }
};
