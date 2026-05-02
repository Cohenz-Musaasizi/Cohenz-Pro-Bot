/**
 * Flirt - Get a random flirty message from API
 */

const axios = require('axios');

module.exports = {
    name: 'flirt',
    aliases: ['pickup', 'pickupline'],
    category: 'fun',
    description: 'Get a random flirty pickup line',
    usage: '.flirt [@user]',

    async execute(sock, msg, args, context) {
      const { from, reply } = context;
      try {
        const response = await axios.get('https://api.shizo.top/quote/flirt?apikey=shizo');
        
        if (!response.data || !response.data.status || !response.data.result) {
          throw new Error('Invalid API response');
        }
        
        const flirtText = response.data.result;
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        
        if (mentioned.length > 0) {
          await sock.sendMessage(from, {
            text: flirtText,
            mentions: mentioned
          }, { quoted: msg });
        } else {
          await reply(flirtText);
        }
        
      } catch (error) {
        console.error('Flirt Error:', error);
        reply(`❌ Error: ${error.message}`);
      }
    }
};
