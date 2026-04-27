// commands/ai/generate.js – DALL‑E if OpenAI key is set, else free Stable Diffusion
const config = require('../../config');
const axios = require('axios');

module.exports = {
  name: 'generate',
  aliases: ['imagine', 'dalle', 'flux', 'img'],
  category: 'ai',
  description: 'Generate an image from text (uses OpenAI if key is set)',
  usage: '.generate a cat wearing a hat',

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    const prompt = args.join(' ');
    if (!prompt) return reply('❌ Example: .generate a sleeping cat');

    const openaiKey = config.apiKeys.openai || process.env.OPENAI_API_KEY;

    if (openaiKey) {
      // Use DALL‑E
      try {
        const res = await axios.post(
          'https://api.openai.com/v1/images/generations',
          { prompt, n: 1, size: '512x512' },
          { headers: { Authorization: `Bearer ${openaiKey}` } }
        );
        const imageUrl = res.data.data[0].url;
        await sock.sendMessage(from, { image: { url: imageUrl }, caption: prompt }, { quoted: msg });
      } catch (err) {
        const errMsg = err.response?.data?.error?.message || err.message;
        await reply(`❌ DALL‑E error: ${errMsg}`);
      }
    } else {
      // Fallback to free API
      try {
        const APIs = require('../../utils/api');
        const result = await APIs.generateImage(prompt);
        const imageUrl = result?.url || result?.data?.url || result?.image;
        if (!imageUrl) throw new Error('No image URL returned');
        await sock.sendMessage(from, { image: { url: imageUrl }, caption: prompt }, { quoted: msg });
      } catch (err) {
        await reply(`❌ ${err.message}`);
      }
    }
  }
};
