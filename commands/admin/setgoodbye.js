/**
 * Set Goodbye - Customize goodbye message
 */

const db = require('../../database');

module.exports = {
  name: 'setgoodbye',
  aliases: ['goodbyetext'],
  category: 'admin',
  description: 'Set custom goodbye message',
  usage: '.setgoodbye <message> (use @user for member mention)',
  groupOnly: true,
  adminOnly: true,
  botAdminNeeded: true,

  async execute(sock, msg, args, context) {
    const { from, sender, reply } = context;
    try {
      if (!args.length) {
        const groupSettings = db.getGroupSettings(from);
        return reply(
          `📝 *Current Goodbye Message*\n\n${groupSettings.goodbyeMessage}\n\n*Usage:* .setgoodbye <message>\n\n*Tip:* Use @user to mention the member who left`
        );
      }

      const goodbyeMessage = args.join(' ');

      if (goodbyeMessage.length > 500) {
        return reply('❌ Goodbye message is too long! Maximum 500 characters.');
      }

      db.updateGroupSettings(from, { goodbyeMessage });

      await reply(
        `✅ Goodbye message updated!\n\n*Preview:*\n${goodbyeMessage.replace('@user', '@' + sender.split('@')[0])}`,
        { mentions: [sender] }
      );

    } catch (error) {
      console.error('Set Goodbye Error:', error);
      await reply(`❌ Error: ${error.message}`);
    }
  }
};
