/**
 * Unmute Command - Open group (all members can send)
 */

module.exports = {
    name: 'unmute',
    aliases: ['open', 'opengroup'],
    category: 'admin',
    description: 'Open group (all members can send messages)',
    usage: '.unmute',
    groupOnly: true,
    adminOnly: true,
    botAdminNeeded: true,
    
    async execute(sock, msg, args, context) {
      const { from, reply } = context;
      try {
        await sock.groupSettingUpdate(from, 'not_announcement');
        await reply('🔓 Group has been opened!\n\nAll members can send messages now.');
        
      } catch (error) {
        await reply(`❌ Error: ${error.message}`);
      }
    }
};
