/**
 * Group Link Command - Get group invite link
 */

module.exports = {
    name: 'grouplink',
    aliases: ['link', 'invite'],
    category: 'admin',
    description: 'Get group invite link',
    usage: '.grouplink',
    groupOnly: true,
    adminOnly: true,
    botAdminNeeded: true,
    
    async execute(sock, msg, args, context) {
      const { from, groupMetadata, reply } = context;
      try {
        const code = await sock.groupInviteCode(from);
        const link = `https://chat.whatsapp.com/${code}`;
        
        let text = `🔗 *GROUP INVITE LINK*\n\n`;
        text += `📱 Group: ${groupMetadata.subject}\n`;
        text += `🔗 Link: ${link}\n\n`;
        text += `⚠️ Don't share this link publicly!`;
        
        await reply(text);
        
      } catch (error) {
        await reply(`❌ Error: ${error.message}`);
      }
    }
  };
