/**
 * Promote Command - Make member admin
 */

const { findParticipant } = require('../../utils/jidHelper');

module.exports = {
  name: 'promote',
  aliases: ['makeadmin'],
  category: 'admin',
  description: 'Promote member to admin',
  usage: '.promote @user',
  groupOnly: true,
  adminOnly: true,
  botAdminNeeded: true,
  
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
        return reply('❌ Please mention or reply to the user to promote!\n\nExample: .promote @user');
      }
      
      // Fetch FRESH group metadata to avoid stale cache
      const freshMetadata = await sock.groupMetadata(from);
      
      // Use findParticipant for LID-aware matching with fresh metadata
      const foundParticipant = findParticipant(freshMetadata.participants, target);
      
      if (!foundParticipant) {
        return reply('❌ User not found in group!');
      }
      
      // Check if already admin using fresh data
      if (foundParticipant.admin === 'admin' || foundParticipant.admin === 'superadmin') {
        return reply('❌ This user is already an admin!');
      }
      
      await sock.groupParticipantsUpdate(from, [target], 'promote');
      
      await sock.sendMessage(from, {
        text: `✅ @${target.split('@')[0]} is now an admin!`,
        mentions: [target]
      }, { quoted: msg });
      
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  }
};
