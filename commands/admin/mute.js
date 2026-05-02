/**
 * Mute Command - Close group (only admins can send)
 */

module.exports = {
    name: 'mute',
    aliases: ['close', 'closegroup'],
    category: 'admin',
    description: 'Close group (only admins can send messages)',
    usage: '.mute',
    groupOnly: true,
    adminOnly: true,
    botAdminNeeded: true,
    
    async execute(sock, msg, args, context) {
      const { from, reply } = context;
      try {
        await sock.groupSettingUpdate(from, 'announcement');
        await reply('🔒 Group has been closed!\n\nOnly admins can send messages now.');
        
      } catch (error) {
        await reply(`❌ Error: ${error.message}`);
      }
    }
};
