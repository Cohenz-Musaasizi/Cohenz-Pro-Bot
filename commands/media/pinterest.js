const axios = require('axios');

module.exports = {
  name: 'pinterest',
  aliases: ['pin'],
  category: 'media',
  description: 'Download images/videos from Pinterest',
  usage: '.pinterest https://pin.it/...',

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    const url = args[0];
    if (!url || !/^https?:\/\//i.test(url)) return reply('❌ Provide a Pinterest link.');

    try {
      await sock.sendPresenceUpdate('composing', from);
      const { data } = await axios.get(`https://api.siputzx.my.id/api/d/pinterest?url=${encodeURIComponent(url)}`);
      const mediaUrl = data?.url || data?.data?.url || data?.data?.download_url;
      if (!mediaUrl) throw new Error('No media link returned');
      if (mediaUrl.endsWith('.mp4')) {
        await sock.sendMessage(from, { video: { url: mediaUrl } }, { quoted: msg });
      } else {
        await sock.sendMessage(from, { image: { url: mediaUrl } }, { quoted: msg });
      }
    } catch (err) {
      await reply(`❌ ${err.message}`);
    } finally {
      await sock.sendPresenceUpdate('paused', from);
    }
  }
};
