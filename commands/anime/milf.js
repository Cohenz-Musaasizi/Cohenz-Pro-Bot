/**
 * Milf Command - Get random milf anime images
 */

const axios = require('axios');

const BASE = 'https://api.princetechn.com/api/anime/milf';
const API_KEY = 'prince';

module.exports = {
  name: 'milf',
  aliases: ['milfnsfw'],
  category: 'anime',
  description: 'Get random milf NSFW anime images',
  usage: '.milf',

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
        throw new Error('Invalid API response: missing image URL');
      }
      
      const imageUrl = response.data.result;
      if (!imageUrl || typeof imageUrl !== 'string') {
        throw new Error('Invalid image URL');
      }
      
      // Download the image directly as buffer
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'image/*' },
        timeout: 30000
      });
      
      const imageBuffer = Buffer.from(imageResponse.data);
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Empty image response');
      }
      
      const maxImageSize = 5 * 1024 * 1024; // 5 MB
      if (imageBuffer.length > maxImageSize) {
        throw new Error(`Image too large: ${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB (max 5MB)`);
      }
      
      await sock.sendMessage(from, {
        image: imageBuffer
      }, { quoted: msg });
      
    } catch (error) {
      console.error('Error in milf command:', error);
      
      if (error.response?.status === 404) {
        return reply('❌ Image not found. Please try again.');
      } else if (error.response?.status === 429) {
        return reply('❌ Rate limit exceeded. Please try again later.');
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return reply('❌ Request timed out. Please try again.');
      } else {
        return reply(`❌ Failed to fetch milf image: ${error.message}`);
      }
    }
  }
};
