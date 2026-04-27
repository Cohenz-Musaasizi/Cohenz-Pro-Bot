const axios = require('axios');

module.exports = {
  name: 'igsc',
  aliases: [],
  category: 'media',
  description: 'Convert Instagram post/reel to cropped sticker',
  usage: '.igsc https://www.instagram.com/p/...',

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    const url = args[0];
    if (!url || !/^https?:\/\//i.test(url)) return reply('❌ Provide an Instagram link.');

    try {
      await sock.sendPresenceUpdate('composing', from);
      const { data } = await axios.get(`https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(url)}`);
      const media = data?.data?.[0] || data;
      const mediaUrl = media?.url || media?.download_url || media?.video_url;
      if (!mediaUrl) throw new Error('No media link returned');

      if (mediaUrl.endsWith('.mp4')) {
        await sock.sendMessage(from, { video: { url: mediaUrl }, caption: 'Reply with .sticker to convert' }, { quoted: msg });
      } else {
        await sock.sendMessage(from, { image: { url: mediaUrl }, caption: 'Reply with .sticker to convert' }, { quoted: msg });
      }
    } catch (err) {
      await reply(`❌ ${err.message}`);
    } finally {
      await sock.sendPresenceUpdate('paused', from);
    }
  }
};
