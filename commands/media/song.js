// commands/media/song.js – Crash-proof song download
const yts = require('yt-search');
const axios = require('axios');

// Primary download APIs (tried in order)
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
];

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

    // 1. Search YouTube if necessary
    try {
      if (!/^https?:\/\//i.test(query)) {
        const search = await yts(query);
        if (!search.videos.length) throw new Error('No results found on YouTube');
        const vid = search.videos[0];
        videoUrl = vid.url;
        videoTitle = vid.title;
        await reply(`🔍 Found: *${videoTitle}*`);
      }
    } catch (err) {
      return reply('❌ Could not find any video. Try different keywords.');
    }

    // 2. Send thumbnail (non-critical, wrapped safely)
    try {
      const vidId = videoUrl.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)?.[1];
      if (vidId && videoTitle) {
        await sock.sendMessage(from, {
          image: { url: `https://img.youtube.com/vi/${vidId}/hqdefault.jpg` },
          caption: `🎵 *${videoTitle}*`,
        }, { quoted: msg });
      }
    } catch (e) {}

    // 3. Download the audio
    let downloadUrl = null;

    for (const dl of DOWNLOADERS) {
      try {
        const { data } = await axios.get(dl.url(videoUrl), { timeout: 15000 });
        const rawUrl = dl.extract(data);
        // Only accept URLs that look like audio files
        if (rawUrl && (rawUrl.endsWith('.mp3') || rawUrl.endsWith('.m4a'))) {
          downloadUrl = rawUrl;
          break;
        }
      } catch (e) {
        // This specific service failed, try the next one
      }
    }

    if (!downloadUrl) {
      return reply('❌ Failed to get a playable audio file. The download services may be down. Please try again in a few minutes.');
    }

    // 4. Send the audio as a playable document
    try {
      await sock.sendMessage(from, {
        audio: { url: downloadUrl },
        mimetype: 'audio/mp4',
        ptt: false,
      }, { quoted: msg });
    } catch (err) {
      // If sending as audio fails, try sending as a generic document
      try {
        await sock.sendMessage(from, {
          document: { url: downloadUrl },
          fileName: videoTitle ? `${videoTitle}.mp3` : 'song.mp3',
          mimetype: 'audio/mpeg',
        }, { quoted: msg });
      } catch (docErr) {
        return reply(`❌ Failed to send the audio file. Please try again.`);
      }
    }
  }
};
