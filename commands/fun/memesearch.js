/**
 * Meme Search Command - Search and get memes
 */

const axios = require('axios');

const BASE = 'https://api.shizo.top/tools/meme-search';

module.exports = {
  name: 'memesearch',
  aliases: ['memes', 'sm', 'smeme', 'gifsearch', 'gif'],
  category: 'fun',
  description: 'Search and get memes',
  usage: 'memesearch <query>',

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    try {
      const query = args.join(' ').trim();
      if (!query) {
        return reply('Usage: .memesearch <query>\n\nExample: .memesearch hello');
      }

      // Fetch meme from API
      const url = `${BASE}?apikey=shizo&query=${encodeURIComponent(query)}`;
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      const mediaBuffer = Buffer.from(response.data);
      if (!mediaBuffer || mediaBuffer.length === 0) {
        throw new Error('Empty response from API');
      }

      const maxSize = 16 * 1024 * 1024; // 16 MB (WhatsApp limit for video)
      if (mediaBuffer.length > maxSize) {
        throw new Error(`File too large: ${(mediaBuffer.length / 1024 / 1024).toFixed(2)} MB (max 16 MB)`);
      }

      // Send as video with gifPlayback (works for GIFs and small videos)
      await sock.sendMessage(from, {
        video: mediaBuffer,
        mimetype: 'video/mp4',
        gifPlayback: true
      }, { quoted: msg });

    } catch (error) {
      console.error('Meme search error:', error);
      reply(`❌ Failed to fetch meme: ${error.message}`);
    }
  }
};
