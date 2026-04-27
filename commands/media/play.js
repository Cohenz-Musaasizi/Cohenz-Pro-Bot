const yts = require('yt-search');
const axios = require('axios');

module.exports = {
  name: 'play',
  aliases: ['yt', 'playvideo'],
  category: 'media',
  description: 'Download YouTube video by name or link',
  usage: '.play Fik Fameica new song',

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    const query = args.join(' ').trim();
    if (!query) return reply('❌ Provide a song name or YouTube link.');

    let videoUrl = query;
    // If not a direct URL, search YouTube for the best match
    if (!/^https?:\/\//i.test(query)) {
      try {
        const search = await yts(query);
        if (!search.videos.length) throw new Error('No results');
        videoUrl = search.videos[0].url;
        await reply(`🔍 Found: *${search.videos[0].title}*`);
      } catch (err) {
        return reply('❌ Could not find any video for that name.');
      }
    }

    // Download the video using siputzx API
    try {
      await sock.sendPresenceUpdate('composing', from);
      const { data } = await axios.get(`https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(videoUrl)}`);
      const downloadUrl = data?.url || data?.data?.download_url || data?.data?.url || data?.data?.video_url;
      if (!downloadUrl) throw new Error('No video link returned');
      await sock.sendMessage(from, { video: { url: downloadUrl } }, { quoted: msg });
    } catch (err) {
      await reply(`❌ Failed: ${err.message}`);
    } finally {
      await sock.sendPresenceUpdate('paused', from);
    }
  }
};
