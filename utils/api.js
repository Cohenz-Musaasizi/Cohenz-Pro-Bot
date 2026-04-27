// commands/ai/ai.js
const APIs = require('../../utils/api');

module.exports = {
  name: 'ai',
  aliases: ['gpt', 'ask'],
  category: 'ai',
  description: 'Chat with AI (ChatGPT-style, with memory)',
  usage: '.ai <your question>',

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    const prompt = args.join(' ');
    if (!prompt) return reply('❌ Usage: .ai <question>');

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
