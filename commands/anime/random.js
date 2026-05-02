/**
 * Random Command - Get random anime data
 */

const axios = require('axios');

const BASE = 'https://api.princetechn.com/api/anime/random';
const API_KEY = 'prince';

module.exports = {
  name: 'random',
  aliases: ['animerandom', 'randomanime'],
  category: 'anime',
  description: 'Get random anime data',
  usage: '.random',

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    try {
      const url = `${BASE}?apikey=${API_KEY}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        },
        timeout: 30000
      });
      
      if (!response.data || !response.data.result) {
        throw new Error('Invalid API response: missing anime data');
      }
      
      const animeData = response.data.result;
      
      // Download thumbnail image (optional)
      let imageBuffer = null;
      if (animeData.thumbnail) {
        try {
          const imageResponse = await axios.get(animeData.thumbnail, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'image/*' },
            timeout: 30000
          });
          
          imageBuffer = Buffer.from(imageResponse.data);
          
          if (imageBuffer && imageBuffer.length > 0) {
            const maxImageSize = 5 * 1024 * 1024; // 5 MB
            if (imageBuffer.length > maxImageSize) {
              imageBuffer = null; // skip if too large
            }
          }
        } catch (imgError) {
          console.error('Error downloading thumbnail:', imgError);
          imageBuffer = null;
        }
      }
      
      // Build caption with anime info
      let caption = `*${animeData.title || 'Unknown'}*\n\n`;
      if (animeData.episodes) caption += `📺 Episodes: ${animeData.episodes}\n`;
      if (animeData.status) caption += `📊 Status: ${animeData.status}\n`;
      if (animeData.synopsis) caption += `\n📝 ${animeData.synopsis}\n`;
      if (animeData.link) caption += `\n🔗 ${animeData.link}`;
      
      // Send with image if available
      if (imageBuffer) {
        await sock.sendMessage(from, {
          image: imageBuffer,
          caption: caption
        }, { quoted: msg });
      } else {
        await sock.sendMessage(from, { text: caption }, { quoted: msg });
      }
      
    } catch (error) {
      console.error('Error in random command:', error);
      
      if (error.response?.status === 404) {
        return reply('❌ Anime data not found. Please try again.');
      } else if (error.response?.status === 429) {
        return reply('❌ Rate limit exceeded. Please try again later.');
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return reply('❌ Request timed out. Please try again.');
      } else {
        return reply(`❌ Failed to fetch anime data: ${error.message}`);
      }
    }
  }
};
