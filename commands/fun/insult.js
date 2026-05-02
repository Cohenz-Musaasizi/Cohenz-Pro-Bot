// commands/fun/insult.js
module.exports = {
  name: 'insult',
  aliases: ['insultme', 'burn'],
  category: 'fun',
  description: 'Give a silly insult to a user. Reply or mention to target someone.',
  usage: '.insult (reply or @user)',

  async execute(sock, msg, args, context) {
    const { from, sender, reply } = context;
    try {
      const ctx = msg.message?.extendedTextMessage?.contextInfo || {};
      const mentioned = ctx.mentionedJid || [];
      let targetId = null;
      if (mentioned.length) targetId = mentioned[0];
      else if (ctx.participant) targetId = ctx.participant;
      else targetId = sender;

      const targetTag = `@${targetId.split('@')[0]}`;

      const insults = [
        "You're as useful as a white crayon.",
        "I'd call you sharp, but that would be offensive to pencils.",
        "You're like a cloud. When you disappear, it's a beautiful day.",
        "You bring everyone so much joy... when you leave the room.",
        "If laziness was an Olympic sport, you'd come in fourth — so you wouldn't have to walk up to the podium."
      ];

      const line = insults[Math.floor(Math.random() * insults.length)];
      await sock.sendMessage(from, { text: `${line}`, mentions: [targetId] }, { quoted: msg });
    } catch (error) {
      console.error('[insult] ERROR:', error);
      reply('❌ Something went wrong.');
    }
  }
};
