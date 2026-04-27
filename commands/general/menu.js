// commands/utility/menu.js
const { loadCommands } = require('../../utils/commandLoader');
const config = require('../../config');

module.exports = {
  name: 'menu',
  aliases: ['help', 'commands'],
  category: 'utility',
  description: 'Show all available commands with usage instructions',
  usage: '.menu (or .help)',

  async execute(sock, msg, args, context) {
    const { reply } = context;
    const commands = loadCommands(); // returns Map

    if (commands.size === 0) return reply('❌ No commands loaded.');

    // Group commands by category, keep only unique command names (ignore aliases)
    const categories = new Map();
    for (const [cmdName, cmd] of commands) {
      // Skip aliases – only add actual command names
      if (cmd.name && cmd.name === cmdName) {
        const cat = cmd.category || 'misc';
        if (!categories.has(cat)) categories.set(cat, []);
        categories.get(cat).push(cmd);
      }
    }

    // Sort categories and commands within them
    for (const [cat, cmds] of categories) {
      cmds.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Build menu text
    let text = `╭━❮ *${config.botName || 'Bot'} MENU* ❯━╮\n\n`;
    text += `✨ Welcome! Here are all available commands.\n`;
    text += `💡 Use *${config.prefix}help <command>* for more details about a specific command.\n\n`;

    for (const [cat, cmds] of categories) {
      text += `📂 *${cat}*\n`;
      for (const cmd of cmds) {
        const desc = cmd.description || '';
        const usage = cmd.usage || '';
        const descLine = desc ? ` - ${desc}` : '';
        const usageLine = usage ? `\n   Usage: \`${usage}\`` : '';
        text += `  ▸ *${config.prefix}${cmd.name}*${descLine}${usageLine}\n`;
      }
      text += '\n';
    }

    text += `╰━━━━━━━━━━━━━━━━╯\n`;
    text += `Prefix: ${config.prefix}\n`;
    text += `Total: ${commands.size} commands (including aliases)\n`;
    text += `Type ${config.prefix}help <command> for detailed help.`;

    await reply(text);
  }
};
