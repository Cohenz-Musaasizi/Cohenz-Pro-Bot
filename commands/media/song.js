const yts = require('yt-search');
const axios = require('axios');

module.exports = {
  name: 'song',
  aliases: ['mp3', 'audio', 'ytaudio'],
  category: 'media',
  description: 'Download YouTube audio (MP3) by name or link',
  usage: '.song Fik Fameica new song',

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    const query = args.join(' ').trim();
    if (!query) return reply('❌ Provide a song name or YouTube link.');

    let videoUrl = query;
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

    try {
      await sock.sendPresenceUpdate('composing', from);
      const { data } = await axios.get(`https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(videoUrl)}`);
      const downloadUrl = data?.url || data?.data?.download_url || data?.data?.url || data?.data?.audio_url;
      if (!downloadUrl) throw new Error('No audio link returned');
      await sock.sendMessage(from, { audio: { url: downloadUrl }, mimetype: 'audio/mp4' }, { quoted: msg });
    } catch (err) {
      await reply(`❌ Failed: ${err.message}`);
    } finally {
      await sock.sendPresenceUpdate('paused', from);
    }
  }
};
