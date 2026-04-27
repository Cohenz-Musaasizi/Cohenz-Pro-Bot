const axios = require('axios');

module.exports = {
  name: 'tiktok',
  aliases: ['tt'],
  category: 'media',
  description: 'Download TikTok videos',
  usage: '.tiktok https://vt.tiktok.com/...',

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    const url = args[0];
    if (!url || !/^https?:\/\//i.test(url)) return reply('❌ Provide a TikTok video link.');

    try {
      await sock.sendPresenceUpdate('composing', from);
      const { data } = await axios.get(`https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(url)}`);
      const videoUrl = data?.url || data?.data?.download_url || data?.data?.url || data?.data?.video_url;
      if (!videoUrl) throw new Error('No video link returned');
      await sock.sendMessage(from, { video: { url: videoUrl } }, { quoted: msg });
    } catch (err) {
      await reply(`❌ ${err.message}`);
    } finally {
      await sock.sendPresenceUpdate('paused', from);
    }
  }
};
