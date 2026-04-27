// commands/utility/menu.js
const { loadCommands } = require('../../utils/commandLoader');
const config = require('../../config');

module.exports = {
  name: 'menu',
  aliases: ['help', 'commands'],
  category: 'utility',
  description: 'Show all available commands',
  usage: '.menu',

  async execute(sock, msg, args, context) {
    const { reply } = context;
    const commands = loadCommands();

    if (commands.size === 0) return reply('❌ No commands loaded.');

    // Group commands by category, only keep the main command name (skip aliases)
    const categories = new Map();
    for (const [name, cmd] of commands) {
      if (cmd.name !== name) continue;           // skip aliases
      const cat = cmd.category || 'misc';
      if (!categories.has(cat)) categories.set(cat, []);
      categories.get(cat).push(cmd);
    }

    // Sort categories and commands alphabetically
    for (const cmds of categories.values()) {
      cmds.sort((a, b) => a.name.localeCompare(b.name));
    }

    let text = `╭━❮ *${config.botName || 'Bot'}* ❯━╮\n\n`;

    for (const [cat, cmds] of categories) {
      text += `📂 *${cat}*\n`;
      for (const cmd of cmds) {
        // Take only the first sentence or first 30 characters of the description
        const short = cmd.description
          ? cmd.description.split('.')[0].slice(0, 40).trim()
          : '';
        const desc = short ? ` - ${short}` : '';
        text += `  ▸ .${cmd.name}${desc}\n`;
      }
      text += '\n';
    }

    text += `╰━━━━━━━━━━━━━━━━╯\n`;
    text += `Prefix: ${config.prefix}\n`;
    text += `Total: ${commands.size} commands\n`;
    text += `Type ${config.prefix}help <command> for detailed help.`;

    await reply(text);
  }
};
