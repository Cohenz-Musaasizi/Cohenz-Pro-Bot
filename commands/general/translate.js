/**
 * Translate Command - Translate text to different languages
 */

const APIs = require('../../utils/api');

module.exports = {
  name: 'translate',
  aliases: ['tr', 'trans'],
  category: 'general',
  description: 'Translate text to another language',
  usage: '.translate <lang code> <text>',
  
  async execute(sock, msg, args, context) {
    const { reply } = context;
    try {
      if (args.length < 2) {
        return reply('❌ Usage: .translate <lang> <text>\n\nExample: .translate es Hello world');
      }
      
      const targetLang = args[0];
      const text = args.slice(1).join(' ');
      
      await reply('🔄 Translating...');
      
      const result = await APIs.translate(text, targetLang);
      
      let replyText = `🌐 *Translation*\n\n`;
      replyText += `📝 Original: ${text}\n`;
      replyText += `🔤 Translated: ${result.translation || result}\n`;
      replyText += `🌍 Language: ${targetLang.toUpperCase()}`;
      
      await reply(replyText);
      
    } catch (error) {
      await reply(`❌ Translation failed!\n\nSupported codes: en, es, fr, de, it, pt, ru, ja, ko, zh\n\nError: ${error.message}`);
    }
  }
};
