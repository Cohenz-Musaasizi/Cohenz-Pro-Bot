/**
 * Calculator Command - Perform math calculations
 */

module.exports = {
    name: 'calc',
    aliases: ['calculate', 'math'],
    category: 'utility',
    description: 'Calculate math expressions',
    usage: '.calc <expression>',
    
    async execute(sock, msg, args, context) {
      const { reply } = context;
      try {
        if (args.length === 0) {
          return reply('❌ Usage: .calc <expression>\n\nExample: .calc 5 + 3 * 2');
        }
        
        const expression = args.join(' ');
        
        // Basic safety check
        if (!/^[0-9+\-*/(). ]+$/.test(expression)) {
          return reply('❌ Invalid expression! Only numbers and operators (+, -, *, /, parentheses) allowed.');
        }
        
        try {
          const result = eval(expression);
          
          let text = `🧮 *Calculator*\n\n`;
          text += `📝 Expression: ${expression}\n`;
          text += `✅ Result: ${result}`;
          
          await reply(text);
        } catch (evalError) {
          await reply('❌ Invalid mathematical expression!');
        }
        
      } catch (error) {
        reply(`❌ Error: ${error.message}`);
      }
    }
};
