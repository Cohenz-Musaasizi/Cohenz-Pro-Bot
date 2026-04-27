// commands/ai/open.js – OpenAI chat completions
const config = require('../../config');
const axios = require('axios');

module.exports = {
  name: 'open',
  aliases: ['openai', 'gpt', 'chatgpt'],
  category: 'ai',
  description: 'Chat with OpenAI (requires OpenAI key)',
  usage: '.open Tell me a joke',

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    const prompt = args.join(' ');
    if (!prompt) return reply('❌ Usage: .open <your question>');

    const apiKey = config.apiKeys.openai || process.env.OPENAI_KEY;
    if (!apiKey) return reply('❌ OpenAI API key not set. Add OPENAI_KEY in Render environment variables.');

    try {
      await sock.sendPresenceUpdate('composing', from);
      const res = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 500,
        },
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      const answer = res.data.choices[0].message.content.trim();
      await reply(answer);
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || err.message;
      await reply(`❌ OpenAI error: ${errMsg}`);
    } finally {
      await sock.sendPresenceUpdate('paused', from);
    }
  }
};
