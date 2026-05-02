/**
 * Ping Command - Check bot response time
 */

module.exports = {
    name: 'ping',
    aliases: ['p'],
    category: 'general',
    description: 'Check bot response time',
    usage: '.ping',
    
    async execute(sock, msg, args, context) {
      const { from, reply } = context;
      try {
        const start = Date.now();
        const sent = await reply('🏓 Pinging...');
        const end = Date.now();
        
        const responseTime = end - start;
        
        await sock.sendMessage(from, {
          text: `🏓 *Pong!*\n⚡ Response Time: ${responseTime}ms`,
          edit: sent.key
        });
        
      } catch (error) {
        await reply(`❌ Error: ${error.message}`);
      }
    }
};
