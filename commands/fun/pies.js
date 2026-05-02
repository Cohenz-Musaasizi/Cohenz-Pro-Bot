/**
 * Pies Command - Get random pies images by country
 */

const axios = require('axios');

const BASE = 'https://api.shizo.top/pies';
const VALID_COUNTRIES = ['india','malaysia', 'thailand', 'china', 'indonesia', 'japan', 'korea', 'vietnam'];

module.exports = {
  name: 'pies',
  aliases: ['pie', 'india', 'malaysia', 'thailand', 'china', 'indonesia', 'japan', 'korea', 'vietnam'],
  category: 'fun',
  description: 'Get random pies images by country',
  usage: '.pies <country>',

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    try {
      const text = msg.message?.conversation || 
                   msg.message?.extendedTextMessage?.text || 
                   '';
      
      const config = require('../../config');
      const prefix = config.prefix || '.';
      const parts = text.trim().split(/\s+/);
      const commandUsed = parts[0]?.replace(prefix, '').toLowerCase() || '';
      
      let country = '';
      if (VALID_COUNTRIES.includes(commandUsed)) {
        country = commandUsed;
      } else {
        country = (args[0] || '').toLowerCase();
      }
      
      if (!country) {
        return reply(`Usage: .pies <country>\n\nCountries: ${VALID_COUNTRIES.join(', ')}`);
      }
      if (!VALID_COUNTRIES.includes(country)) {
        return reply(`❌ Unsupported country: ${country}\n\nTry one of: ${VALID_COUNTRIES.join(', ')}`);
      }
      
      const url = `${BASE}/${country}?apikey=shizo`;
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      const imageBuffer = Buffer.from(response.data);
      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('image')) {
        throw new Error('API did not return an image');
      }
      
      await sock.sendMessage(from, {
        image: imageBuffer,
        caption: `pies: ${country}`
      }, { quoted: msg });
      
    } catch (error) {
      console.error('Error in pies command:', error);
      reply(`❌ Failed to fetch image: ${error.message}`);
    }
  }
};
