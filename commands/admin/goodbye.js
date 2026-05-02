/**
 * Goodbye - Enable/disable goodbye messages
 */

const db = require('../../database');

module.exports = {
  name: 'goodbye',
  aliases: ['goodbyeon', 'goodbyeoff'],
  category: 'admin',
  description: 'Enable/disable goodbye messages',
  usage: '.goodbye on/off',
  groupOnly: true,
  adminOnly: true,
  botAdminNeeded: true,

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    try {
      const action = args[0]?.toLowerCase();

      if (!action || !['on', 'off'].includes(action)) {
        const groupSettings = db.getGroupSettings(from);
        const status = groupSettings.goodbye ? '✅ Enabled' : '❌ Disabled';
        return reply(
          `👋 *Goodbye Messages*\n\n` +
          `Status: ${status}\n` +
          `Message: ${groupSettings.goodbyeMessage}\n\n` +
          `Usage: .goodbye on/off\n\n` +
          `To customize: .setgoodbye <message>`
        );
      }

      const enable = action === 'on';
      db.updateGroupSettings(from, { goodbye: enable });

      await reply(
        `✅ Goodbye messages ${enable ? 'enabled' : 'disabled'}!` +
        `${enable ? '\n\nLeaving members will now receive goodbye messages.' : ''}`
      );

    } catch (error) {
      console.error('Goodbye Error:', error);
      await reply(`❌ Error: ${error.message}`);
    }
  }
};
