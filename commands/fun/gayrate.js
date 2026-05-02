// commands/fun/gayrate.js
module.exports = {
  name: 'gayrate',
  aliases: ['gay'],
  category: 'fun',
  description: 'Playful gay percentage. Reply or mention a user.',
  usage: '.gayrate (reply or @user)',

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

      // deterministic-ish but random: base on id to make repeatable so it's less spammy
      const base = targetId.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
      const percent = ((base % 101) + Math.floor(Math.random() * 7)) % 101; // 0-100

      const messages = [
        `${targetTag} is ${percent}% fabulous 🌈`,
        `💖 Compatibility with rainbows: ${percent}% for ${targetTag}`,
        `${targetTag} score: ${percent}% pure glitter ✨`
      ];

      const out = messages[Math.floor(Math.random() * messages.length)];
      await sock.sendMessage(from, { text: out, mentions: [targetId] }, { quoted: msg });
    } catch (error) {
      console.error('[gayrate] ERROR:', error);
      reply('❌ Something went wrong.');
    }
  }
};
