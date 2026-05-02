const axios = require('axios');

module.exports = {
  name: 'getpp',
  aliases: ['gp', 'getpic'],
  category: 'general',
  description: 'Get profile picture of a user',
  usage: '.getpp (reply to message or tag user)',
  
  async execute(sock, msg, args, context) {
    const { from, sender, reply } = context;
    try {
      let targetUser = null;
      
      // Check if it's a reply
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (quotedMessage) {
        targetUser = msg.message.extendedTextMessage.contextInfo.participant;
      } else {
        const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        if (mentionedJid && mentionedJid.length > 0) {
          targetUser = mentionedJid[0];
        } else {
          targetUser = sender;
        }
      }
      
      if (!targetUser) {
        return reply('❌ Could not identify target user. Please reply to a message or tag a user.');
      }
      
      try {
        const ppUrl = await sock.profilePictureUrl(targetUser, 'image');
        if (!ppUrl) {
          return reply('❌ Profile picture not found for this user.');
        }
        
        const response = await axios.get(ppUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        
        await sock.sendMessage(from, { 
          image: buffer,
          caption: `👤 Profile picture of @${targetUser.split('@')[0]}`,
          mentions: [targetUser]
        }, { quoted: msg });
        
      } catch (profileError) {
        if (profileError.message?.includes('item-not-found') || 
            profileError.output?.statusCode === 404 || 
            profileError.output?.statusCode === 500 ||
            profileError.message?.includes('not found')) {
          return reply('❌ Profile picture not found for this user.');
        } else if (profileError.output?.statusCode === 401 || 
                   profileError.message?.includes('forbidden') || 
                   profileError.message?.includes('unauthorized')) {
          return reply('❌ Profile picture not found. The user\'s profile picture is private or not available.');
        } else {
          return reply('❌ Profile picture not found for this user.');
        }
      }
      
    } catch (error) {
      reply('❌ Profile picture not found for this user.');
    }
  }
};
