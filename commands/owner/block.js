/**
 * Block Command - Block a user
 */

module.exports = {
  name: 'block',
  aliases: [],
  category: 'owner',
  description: 'Block a user',
  usage: '.block @user or reply',
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
        return reply('❌ Please mention or reply to a user to block!');
      }
      
      await sock.updateBlockStatus(target, 'block');
      
      await sock.sendMessage(from, {
        text: `✅ @${target.split('@')[0]} has been blocked!`,
        mentions: [target]
      }, { quoted: msg });
      
    } catch (error) {
      reply(`❌ Error: ${error.message}`);
    }
  }
};
