const config = require('../../config');
const APIs = require('../../utils/api');

module.exports = {
  name: 'gemini',
  aliases: ['gemi'],
  category: 'ai',
  description: 'Chat with Google Gemini AI (with memory)',
  usage: '.gemini hi',

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    const prompt = args.join(' ');
    if (!prompt) return reply('❌ Example: .gemini Hello');

    try {
      await sock.sendPresenceUpdate('composing', from);
      const response = await APIs.gemini(prompt, from);
      await reply(response);
    } catch (err) {
      await reply(`❌ ${err.message}`);
    } finally {
      await sock.sendPresenceUpdate('paused', from);
    }
  }
};
