// commands/utility/menu.js
const { loadCommands } = require('../../utils/commandLoader');
const config = require('../../config');

module.exports = {
  name: 'menu',
  aliases: ['help', 'commands'],
  category: 'utility',
  description: 'Show all available commands',
  usage: '.menu (or .help)',

  async execute(sock, msg, args, context) {
    const { reply } = context;
    const commands = loadCommands(); // returns Map

    if (commands.size === 0) return reply('❌ No commands loaded.');

    // Group commands by category
    const categories = new Map();
    for (const [cmdName, cmd] of commands) {
      const cat = cmd.category || 'misc';
      if (!categories.has(cat)) categories.set(cat, []);
      categories.get(cat).push(`  ▸ ${cmdName}`);
    }

    let text = `╭━❮ *${config.botName || 'Bot'} MENU* ❯━╮\n\n`;
    for (const [cat, cmds] of categories) {
      text += `📂 *${cat}*\n`;
      text += cmds.join('\n');
      text += '\n\n';
    }
    text += `╰━━━━━━━━━━━━━━━━╯\n`;
    text += `Prefix: ${config.prefix}\n`;
    text += `Total: ${commands.size} commands`;

    await reply(text);
  }
};
