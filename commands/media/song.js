const yts = require('yt-search');
const axios = require('axios');

module.exports = {
  name: 'song',
  aliases: ['mp3', 'audio', 'ytaudio'],
  category: 'media',
  description: 'Download YouTube audio by name or link',
  usage: '.song Fik Fameica new song',

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    const query = args.join(' ').trim();
    if (!query) return reply('❌ Provide a song name or YouTube link.');

    let videoUrl = query;
    let videoTitle = '';

    // Search YouTube if needed
    if (!/^https?:\/\//i.test(query)) {
      try {
        const search = await yts(query);
        if (!search.videos.length) throw new Error('No results');
        videoUrl = search.videos[0].url;
        videoTitle = search.videos[0].title;
        await reply(`🔍 Found: *${videoTitle}*`);
      } catch (e) {
        return reply('❌ Could not find any video. Try different keywords.');
      }
    }

    // Try to send thumbnail
    try {
      const vidId = videoUrl.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)?.[1];
      if (vidId) {
        await sock.sendMessage(from, {
          image: { url: `https://img.youtube.com/vi/${vidId}/hqdefault.jpg` },
          caption: videoTitle ? `🎵 *${videoTitle}*` : '🎵 Your song',
        }, { quoted: msg });
      }
    } catch (e) {}

    // Try multiple reliable download APIs
    const downloaders = [
      {
        name: 'giftedtech',
        url: (vu) => `https://api.giftedtech.my.id/api/download/ytmp3?url=${encodeURIComponent(vu)}`,
        extract: (d) => d?.result?.download_url || d?.result?.url || d?.url || d?.download_url,
      },
      {
        name: 'siputzx',
        url: (vu) => `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(vu)}`,
        extract: (d) => d?.url || d?.data?.download_url || d?.data?.url || d?.data?.audio_url,
      },
    ];

    let downloadUrl = null;
    for (const dl of downloaders) {
      try {
        const { data } = await axios.get(dl.url(videoUrl), { timeout: 20000 });
        const extracted = dl.extract(data);
        if (extracted && (extracted.endsWith('.mp3') || extracted.endsWith('.m4a') || extracted.includes('audio'))) {
          downloadUrl = extracted;
          break;
        }
      } catch (e) {}
    }

    if (!downloadUrl) {
      return reply('❌ Failed to get a playable audio file. The download services may be down. Please try again in a few minutes.');
    }

    // Send as audio first, fallback to document
    try {
      await sock.sendMessage(from, {
        audio: { url: downloadUrl },
        mimetype: 'audio/mp4',
        ptt: false,
      }, { quoted: msg });
    } catch (e) {
      try {
        await sock.sendMessage(from, {
          document: { url: downloadUrl },
          fileName: videoTitle ? `${videoTitle}.mp3` : 'song.mp3',
          mimetype: 'audio/mpeg',
        }, { quoted: msg });
      } catch (err) {
        reply('❌ Failed to send the audio file.');
      }
    }
  }
};
