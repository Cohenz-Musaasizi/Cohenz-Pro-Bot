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
  
  async execute(sock, msg, args, context) {
    const { reply } = context;
    try {
      if (args.length === 0) {
        return reply('❌ Usage: .ai <question>\n\nExample: .ai What is the capital of France?');
      }
      
      const question = args.join(' ');
      
      const response = await APIs.chatAI(question);
      
      // Send only the answer without labels
      const answer = response.response || response.msg || response.data?.msg || response;
      await reply(answer);
      
    } catch (error) {
      await reply(`❌ AI Error: ${error.message}`);
    }
  }
};
