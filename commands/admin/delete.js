/**
 * Delete Command
 * Delete a replied message
 */

module.exports = {
  name: 'delete',
  aliases: ['del'],
  description: 'Delete a replied message',
  usage: '.delete (reply to a message)',
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  botAdminNeeded: true,
  
  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    try {
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      
      if (!ctx?.stanzaId || !ctx?.participant) {
        return reply('🗑️ Reply to the message you want to delete.');
      }
      
      const deleteKey = { 
        remoteJid: from, 
        id: ctx.stanzaId, 
        participant: ctx.participant 
      };
      
      await sock.sendMessage(from, { delete: deleteKey });
      
    } catch (error) {
      console.error('Delete command error:', error);
      await reply('❌ Failed to delete message.');
    }
  }
};
