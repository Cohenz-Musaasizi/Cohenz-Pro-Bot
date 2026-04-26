// commands/ai/generate.js
const APIs = require('../../utils/api');

module.exports = {
  name: 'generate',
  aliases: ['dalle', 'imagine', 'flux', 'imagineai'],
  category: 'ai',
  description: 'Generate an image from a text prompt (free)',
  usage: '.generate <prompt>',

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    const prompt = args.join(' ');
    if (!prompt) return reply('❌ Example: .generate a sleeping cat');

    try {
      const result = await APIs.generateImage(prompt);
      const imageUrl = result?.url || result?.data?.url || result?.image;
      if (!imageUrl) throw new Error('No image URL returned');
      await sock.sendMessage(from, {
        image: { url: imageUrl },
        caption: prompt
      }, { quoted: msg });
    } catch (err) {
      console.error('Generate error:', err);
      reply(`❌ ${err.message}`);
    }
  }
};
