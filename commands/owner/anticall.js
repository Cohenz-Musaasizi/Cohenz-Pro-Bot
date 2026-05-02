/**
 * Anti-Call Command - Enable or disable anti-call system
 */

module.exports = {
  name: 'anticall',
  category: 'owner',
  ownerOnly: true,
  description: 'Enable or disable anti-call system',
  usage: '.anticall on/off',

  async execute(sock, msg, args, context) {
    const { reply } = context;
    if (!args[0]) {
      return reply('Usage: .anticall on/off');
    }

    const option = args[0].toLowerCase();

    if (!['on', 'off'].includes(option)) {
      return reply('Usage: .anticall on/off');
    }

    const enabled = option === 'on';

    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, '../../config.js');
    
    try {
      let configFile = fs.readFileSync(configPath, 'utf8');
      
      if (enabled) {
        configFile = configFile.replace(/anticall:\s*false/g, 'anticall: true');
      } else {
        configFile = configFile.replace(/anticall:\s*true/g, 'anticall: false');
      }
      
      fs.writeFileSync(configPath, configFile);
      delete require.cache[require.resolve('../../config')];
      
      reply(
        enabled
          ? '✅ Anti-call enabled. Calls will be auto-rejected & blocked.'
          : '❌ Anti-call disabled.'
      );
    } catch (err) {
      console.error('[anticall cmd] error:', err);
      reply('❌ Error updating anti-call setting.');
    }
  }
};
