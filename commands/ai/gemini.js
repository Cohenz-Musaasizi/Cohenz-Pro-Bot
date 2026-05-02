/**
 * Gemini AI Command
 * Command: .gemini <prompt>
 */

const APIs = require('../../utils/api');
const config = require('../../config');

module.exports = {
  name: 'gemini',
  aliases: [],
  category: 'ai',
  description: 'Chat with Google Gemini AI',
  usage: '.gemini <your question>',

  async execute(sock, msg, args, context) {
    const { from, sender, reply, react } = context;

    // Check if there's a prompt
    const prompt = args.join(' ');
    if (!prompt) {
      return reply('❌ Please provide a prompt. Example: `.gemini hello`');
    }

    // Typing indicator
    await sock.sendPresenceUpdate('composing', from);

    try {
      // Call the Gemini API from our utils
      const response = await APIs.gemini(prompt);
      
      await reply(`🤖 *Gemini says:*\n\n${response}`);
    } catch (error) {
      console.error('Gemini Error:', error.message);
      await reply(`❌ Failed to get response from Gemini: ${error.message}`);
    } finally {
      // Stop typing
      await sock.sendPresenceUpdate('paused', from);
    }
  }
};
