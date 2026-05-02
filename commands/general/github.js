/**
 * GitHub Command - Show bot GitHub repository and stats
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'github',
    aliases: ['repo', 'git', 'source', 'sc', 'script'],
    category: 'general',
    description: 'Show bot GitHub repository and statistics',
    usage: '.github',
    ownerOnly: false,

    async execute(sock, msg, args, context) {
        const { from, reply } = context;
        try {
            const repoUrl = 'https://github.com/mruniquehacker/KnightBot-Mini';
            const apiUrl = 'https://api.github.com/repos/mruniquehacker/KnightBot-Mini';

            const loadingMsg = await reply('🔍 Fetching GitHub repository information...');

            try {
                const response = await axios.get(apiUrl, {
                    headers: {
                        'User-Agent': 'KnightBot-Mini'
                    }
                });
                
                const repo = response.data;

                let message = `╭━━『 *GitHub Repository* 』━━╮\n\n`;
                message += `🤖 *Bot Name:* ${config.botName}\n`;
                message += `🔗 *Repository:* ${repo.name}\n`;
                message += `👨‍💻 *Owner:* ${repo.owner.login}\n`;
                message += `📄 *Description:* ${repo.description || 'No description provided'}\n`;
                message += `🌐 *URL:* ${repo.html_url}\n\n`;
                
                message += `📊 *Repository Statistics*\n`;
                message += `⭐ *Stars:* ${repo.stargazers_count.toLocaleString()}\n`;
                message += `🍴 *Forks:* ${repo.forks_count.toLocaleString()}\n`;
                message += `👁️ *Watchers:* ${repo.watchers_count.toLocaleString()}\n`;
                message += `📦 *Size:* ${(repo.size / 1024).toFixed(2)} MB\n\n`;
                
                message += `🔗 *Quick Links*\n`;
                message += `⭐ Star: ${repo.html_url}/stargazers\n`;
                message += `🍴 Fork: ${repo.html_url}/fork\n`;
                message += `📥 Clone: git clone ${repo.clone_url}\n\n`;
                
                message += `╰━━━━━━━━━━━━━━━╯\n\n`;
                message += `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${config.botName}*`;

                await sock.sendMessage(from, {
                    text: message,
                    edit: loadingMsg.key
                });

            } catch (apiError) {
                console.error('GitHub API Error:', apiError.message);
                
                let fallbackMessage = `╭━━『 *GitHub Repository* 』━━╮\n\n`;
                fallbackMessage += `🤖 *Bot Name:* ${config.botName}\n`;
                fallbackMessage += `🔗 *Repository:* KnightBot-Mini\n`;
                fallbackMessage += `👨‍💻 *Owner:* mruniquehacker\n`;
                fallbackMessage += `🌐 *URL:* ${repoUrl}\n\n`;
                fallbackMessage += `⚠️ *Note:* Unable to fetch real-time statistics.\n`;
                fallbackMessage += `Please visit the repository directly for latest stats.\n\n`;
                fallbackMessage += `╰━━━━━━━━━━━━━━━╯\n\n`;
                fallbackMessage += `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${config.botName}*`;

                await sock.sendMessage(from, {
                    text: fallbackMessage,
                    edit: loadingMsg.key
                });
            }

        } catch (error) {
            console.error('GitHub command error:', error);
            await reply(`❌ Error: ${error.message}`);
        }
    }
};
