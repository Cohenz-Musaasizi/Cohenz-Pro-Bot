// commands/utility/play.js
const axios = require('axios');

module.exports = {
  name: 'play',
  aliases: ['song', 'yt'],
  category: 'utility',
  description: 'Download YouTube audio/video by name or link',
  usage: '.play Shape of You  (or .play https://youtu.be/xxx)',

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    const input = args.join(' ').trim();
    if (!input) return reply('❌ Provide a song name or YouTube link.\nExample: .play Shape of You');

    let url = input;
    // If not a URL, search on YouTube
    if (!/^https?:\/\//i.test(input)) {
      try {
        const search = await axios.get(`https://api.siputzx.my.id/api/s/ytsearch?query=${encodeURIComponent(input)}&limit=1`);
        const video = search.data?.data?.[0];
        if (!video) throw new Error('No results');
        url = video.url;
        await reply(`🔍 Found: *${video.title}*`);
      } catch {
        return reply('❌ Could not find any video on YouTube.');
      }
    }

    try {
      await sock.sendPresenceUpdate('composing', from);
      const { data } = await axios.get(`https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(url)}`);
      const downloadUrl = data?.url || data?.data?.download_url || data?.data?.url;
      if (!downloadUrl) throw new Error('Download link missing');
      await sock.sendMessage(from, { video: { url: downloadUrl } }, { quoted: msg });
    } catch (err) {
      await reply(`❌ Failed: ${err.message}`);
    } finally {
      await sock.sendPresenceUpdate('paused', from);
    }
  }
};
