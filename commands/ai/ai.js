/**
 * AI Chat Command - ChatGPT-style responses
 */

const APIs = require('../../utils/api');

module.exports = {
  name: 'ai',
  aliases: ['gpt', 'chatgpt', 'ask'],
  category: 'ai',
  description: 'Chat with AI (ChatGPT-style)',
  usage: '.ai <question>',
  
  async execute(sock, msg, args, extra) {
    const { from, reply } = extra;

    if (args.length === 0) {
      return reply('❌ Usage: .ai <question>\n\nExample: .ai What is the capital of France?');
    }

    const question = args.join(' ');

    // Show typing indicator
    await sock.sendPresenceUpdate('composing', from);

    try {
      const response = await APIs.chatAI(question);
      
      // Extract answer from possible response formats
      const answer = response.response || response.msg || response.data?.msg || 'No response';
      await reply(answer);
    } catch (error) {
      console.error('AI Error:', error.message);
      await reply(`❌ AI Error: ${error.message}`);
    } finally {
      // Stop typing
      await sock.sendPresenceUpdate('paused', from);
    }
  }
};
