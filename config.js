/**
 * Global Configuration for WhatsApp MD Bot
 */

module.exports = {
    // Bot Owner Configuration
    ownerNumber: ['256756803655'],
    ownerName: ['Marvin Musaasizi', 'Professor'],

    // Bot Configuration
    botName: 'Cohenz Pro Bot',
    prefix: '.',
    sessionName: 'session',
    sessionID: process.env.SESSION_ID || '',
    newsletterJid: '120363161513685998@newsletter',
    updateZipUrl: 'https://github.com/mruniquehacker/KnightBot-Mini/archive/refs/heads/main.zip',

    // Sticker Configuration
    packname: 'iMac Recordz',

    // Bot Behavior
    selfMode: false,
    autoRead: false,
    autoTyping: false,
    autoBio: true,
    autoSticker: false,
    autoReact: false,
    autoReactMode: 'bot',
    autoDownload: false,

    // Group Settings Defaults
    defaultGroupSettings: {
        antilink: false,
        antilinkAction: 'delete',
        antitag: false,
        antitagAction: 'delete',
        antiall: false,
        antiviewonce: false,
        antibot: false,
        anticall: false,
        antigroupmention: false,
        antigroupmentionAction: 'delete',
        welcome: false,
        welcomeMessage: '╭╼━≪•𝙽𝙴𝚆 𝙼𝙴𝙼𝙱𝙴𝚁•≫━╾╮\n┃𝚆𝙴𝙻𝙲𝙾𝙼𝙴: @user 👋\n┃Member count: #memberCount\n┃𝚃𝙸𝙼𝙴: time⏰\n╰━━━━━━━━━━━━━━━╯\n\n*@user* Welcome to *@group*! 🎉\n*Group 𝙳𝙴𝚂𝙲𝚁𝙸𝙿𝚃𝙸𝙾𝙽*\ngroupDesc\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ Cohenz Pro Bot*',
        goodbye: false,
        goodbyeMessage: 'Goodbye @user 👋 We will never miss you!',
        antiSpam: false,
        antidelete: false,
        nsfw: false,
        detect: false,
        chatbot: false,
        autosticker: false
    },

    // API Keys (loaded from Hugging Face Secrets)
    apiKeys: {
        openai: process.env.OPENAI_KEY || '',
        deepai: process.env.DEEPAI_KEY || '',
        gemini: process.env.GEMINI_KEY || '',
        remove_bg: process.env.REMOVEBG_KEY || ''
    },

    // Message Configuration
    messages: {
        wait: '⏳ Please wait...',
        success: '✅ Success!',
        error: '❌ Error occurred!',
        ownerOnly: '👑 This command is only for bot owner!',
        adminOnly: '🛡️ This command is only for group admins!',
        groupOnly: '👥 This command can only be used in groups!',
        privateOnly: '💬 This command can only be used in private chat!',
        botAdminNeeded: '🤖 Bot needs to be admin to execute this command!',
        invalidCommand: '❓ Invalid command! Type .menu for help'
    },

    // Timezone
    timezone: 'Africa/Kampala',

    // Limits
    maxWarnings: 3,

    // Social Links
    social: {
        github: 'https://github.com/Cohenz-Musaasizi',
        youtube: 'http://youtube.com/@cohenzpro'
    }
};
