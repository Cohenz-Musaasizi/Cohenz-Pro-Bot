// commands/utility/download.js
const axios = require('axios');

module.exports = {
  name: 'download',
  aliases: ['dl', 'get'],
  category: 'utility',
  description: 'Download audio/video from YouTube by name or link.\nAdd "audio" to get MP3.',
  usage: '.download Shape of You\n.download https://youtu.be/xxx audio',

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    const input = args.join(' ').trim();
    if (!input) return reply('❌ Provide a song name or link. Add "audio" for MP3.\nExample: .download Shape of You audio');

    const isAudio = / audio$/i.test(input);
    const query = input.replace(/\s*audio$/i, '').trim();

    let url = query;
    if (!/^https?:\/\//i.test(query)) {
      try {
        const search = await axios.get(`https://api.siputzx.my.id/api/s/ytsearch?query=${encodeURIComponent(query)}&limit=1`);
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
      const endpoint = isAudio ? 'ytmp3' : 'ytmp4';
      const { data } = await axios.get(`https://api.siputzx.my.id/api/d/${endpoint}?url=${encodeURIComponent(url)}`);
      const downloadUrl = data?.url || data?.data?.download_url || data?.data?.url || (isAudio ? data?.data?.audio_url : data?.data?.video_url);
      if (!downloadUrl) throw new Error('No download link');

      if (isAudio) {
        await sock.sendMessage(from, { audio: { url: downloadUrl }, mimetype: 'audio/mp4' }, { quoted: msg });
      } else {
        await sock.sendMessage(from, { video: { url: downloadUrl } }, { quoted: msg });
      }
    } catch (err) {
      await reply(`❌ Failed: ${err.message}`);
    } finally {
      await sock.sendPresenceUpdate('paused', from);
    }
  }
};
