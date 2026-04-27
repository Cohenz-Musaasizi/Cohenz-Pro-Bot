// commands/ai/gemini.js
const APIs = require('../../utils/api');

module.exports = {
  name: 'gemini',
  aliases: [],
  category: 'ai',
  description: 'Chat with Gemini AI (with memory)',
  usage: '.gemini <your question>',

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    const prompt = args.join(' ');
    if (!prompt) return reply('❌ Usage: .gemini <question>');

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
