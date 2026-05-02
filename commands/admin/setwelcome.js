/**
 * Set Welcome - Customize welcome message
 */

const db = require('../../database');

module.exports = {
  name: 'setwelcome',
  aliases: ['welcometext'],
  category: 'admin',
  description: 'Set custom welcome message',
  usage: '.setwelcome <message> (use @user for member mention)',
  groupOnly: true,
  adminOnly: true,
  botAdminNeeded: true,

  async execute(sock, msg, args, context) {
    const { from, sender, reply } = context;
    try {
      if (!args.length) {
        const groupSettings = db.getGroupSettings(from);
        return reply(
          `📝 *Current Welcome Message*\n\n${groupSettings.welcomeMessage}\n\n*Usage:* .setwelcome <message>\n\n*Tip:* Use @user to mention the new member`
        );
      }

      const welcomeMessage = args.join(' ');

      if (welcomeMessage.length > 500) {
        return reply('❌ Welcome message is too long! Maximum 500 characters.');
      }

      db.updateGroupSettings(from, { welcomeMessage });

      await reply(
        `✅ Welcome message updated!\n\n*Preview:*\n${welcomeMessage.replace('@user', '@' + sender.split('@')[0])}`,
        { mentions: [sender] }
      );

    } catch (error) {
      console.error('Set Welcome Error:', error);
      await reply(`❌ Error: ${error.message}`);
    }
  }
};
