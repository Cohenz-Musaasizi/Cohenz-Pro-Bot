/**
 * Unblock Command - Unblock a user
 */

module.exports = {
  name: 'unblock',
  aliases: [],
  category: 'owner',
  description: 'Unblock a user',
  usage: '.unblock @user or reply',
  ownerOnly: true,
  
  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    try {
      let target;
      
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const mentioned = ctx?.mentionedJid || [];
      
      if (mentioned && mentioned.length > 0) {
        target = mentioned[0];
      } else if (ctx?.participant && ctx.stanzaId && ctx.quotedMessage) {
        target = ctx.participant;
      } else {
        return reply('❌ Please mention or reply to a user to unblock!');
      }
      
      await sock.updateBlockStatus(target, 'unblock');
      
      await sock.sendMessage(from, {
        text: `✅ @${target.split('@')[0]} has been unblocked!`,
        mentions: [target]
      }, { quoted: msg });
      
    } catch (error) {
      reply(`❌ Error: ${error.message}`);
    }
  }
};
