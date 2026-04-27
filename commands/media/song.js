const yts = require('yt-search');
const axios = require('axios');

// Extract video ID from various YouTube URL formats
const getVideoId = (url) => {
  const match = url.match(/(?:youtu\.be\/|watch\?v=|\/embed\/|\/v\/|\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

// Thumbnail URL from video ID
const getThumbnail = (url) => {
  const id = getVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
};

// Multiple downloader backends to try in order
const DOWNLOADERS = [
  {
    name: 'siputzx',
    url: (vu) => `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(vu)}`,
    extract: (d) => d?.url || d?.data?.download_url || d?.data?.url || d?.data?.audio_url,
  },
  {
    name: 'yupra',
    url: (vu) => `https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(vu)}`,
    extract: (d) => d?.data?.download_url || d?.data?.url || d?.data?.audio_url,
  },
  {
    name: 'okatsu',
    url: (vu) => `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(vu)}`,
    extract: (d) => d?.dl || d?.download || d?.url || d?.data?.url,
  },
  {
    name: 'eliteprotech',
    url: (vu) => `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(vu)}&format=mp3`,
    extract: (d) => d?.downloadURL || d?.data?.downloadURL,
  },
];

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
    let videoTitle = '';
    let thumbnailUrl = '';

    // Search YouTube if user typed a name (not a direct URL)
    if (!/^https?:\/\//i.test(query)) {
      try {
        const search = await yts(query);
        if (!search.videos.length) throw new Error('No results');
        const vid = search.videos[0];
        videoUrl = vid.url;
        videoTitle = vid.title;
        thumbnailUrl = vid.thumbnail || getThumbnail(videoUrl);
        await reply(`🔍 Found: *${videoTitle}*`);
      } catch (err) {
        return reply('❌ Could not find any video.');
      }
    } else {
      thumbnailUrl = getThumbnail(videoUrl);
    }

    try {
      await sock.sendPresenceUpdate('composing', from);

      // 1. Send thumbnail first
      if (thumbnailUrl) {
        try {
          await sock.sendMessage(from, {
            image: { url: thumbnailUrl },
            caption: videoTitle ? `🎵 *${videoTitle}*` : '🎵 Your Song',
          }, { quoted: msg });
        } catch (e) { /* ignore if thumbnail fails */ }
      }

      // 2. Try each downloader until one works
      let downloadUrl = null;
      for (const dl of DOWNLOADERS) {
        try {
          const { data } = await axios.get(dl.url(videoUrl), { timeout: 20000 });
          const extracted = dl.extract(data);
          if (extracted) {
            downloadUrl = extracted;
            break;
          }
        } catch (e) {
          // try next one
        }
      }

      if (!downloadUrl) throw new Error('All download services failed. Please try again later.');

      // 3. Send audio
      await sock.sendMessage(from, {
        audio: { url: downloadUrl },
        mimetype: 'audio/mp4',
        ptt: false,
      }, { quoted: msg });

    } catch (err) {
      await reply(`❌ Failed: ${err.message}`);
    } finally {
      await sock.sendPresenceUpdate('paused', from);
    }
  }
};
