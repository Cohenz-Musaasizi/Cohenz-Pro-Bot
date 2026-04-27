// commands/media/song.js
const axios = require('axios');

module.exports = {
  name: 'song',
  aliases: ['mp3', 'audio', 'ytaudio'],
  category: 'media',
  description: 'Download YouTube audio (MP3) by name or link',
  usage: '.song Shape of You  (or .song https://youtu.be/xxx)',

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    const input = args.join(' ').trim();
    if (!input) return reply('❌ Provide a song name or YouTube link.\nExample: .song Shape of You');

    let url = input;
    if (!/^https?:\/\//i.test(input)) {
      try {
        const search = await axios.get(`https://api.siputzx.my.id/api/s/ytsearch?query=${encodeURIComponent(input)}&limit=1`);
        const video = search.data?.data?.[0];
        if (!video) throw new Error('No YouTube results found');
        url = video.url;
        await reply(`🔍 Found: *${video.title}*`);
      } catch {
        return reply('❌ Could not find any YouTube video for that name.');
      }
    }

    try {
      await sock.sendPresenceUpdate('composing', from);
      const { data } = await axios.get(`https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(url)}`);
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
