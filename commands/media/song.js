// commands/media/song.js – Reliable Audio Download with Format Check
const yts = require('yt-search');
const axios = require('axios');

// Verify that a URL points to a valid audio format WhatsApp can play
const isValidAudioUrl = (url) => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.endsWith('.mp3') || lower.endsWith('.m4a') || lower.includes('audio/mpeg') || lower.includes('audio/mp4');
};

// Best free MP3 downloader services (prioritize those returning real .mp3 URLs)
const DOWNLOADERS = [
  {
    name: 'flashdl',
    url: (vu) => `https://api.flashdl.one/api/youtube/download?url=${encodeURIComponent(vu)}&type=mp3`,
    extract: (d) => d?.data?.downloadUrl || d?.downloadUrl || d?.url,
  },
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

    if (!/^https?:\/\//i.test(query)) {
      try {
        const search = await yts(query);
        if (!search.videos.length) throw new Error('No results');
        const vid = search.videos[0];
        videoUrl = vid.url;
        videoTitle = vid.title;
        await reply(`🔍 Found: *${videoTitle}*`);
      } catch (err) {
        return reply('❌ Could not find any video.');
      }
    }

    try {
      await sock.sendPresenceUpdate('composing', from);

      let downloadUrl = null;
      for (const dl of DOWNLOADERS) {
        try {
          const { data } = await axios.get(dl.url(videoUrl), { timeout: 20000 });
          const extracted = dl.extract(data);
          if (extracted && isValidAudioUrl(extracted)) {
            downloadUrl = extracted;
            break;
          }
        } catch (e) { /* try next */ }
      }

      if (!downloadUrl) throw new Error('All download services failed or returned unplayable files.');

      // Send as audio with explicit mimetype to ensure compatibility
      await sock.sendMessage(from, {
        audio: { url: downloadUrl },
        mimetype: 'audio/mp4',  // WhatsApp prefers MP4 audio container
        ptt: false,
      }, { quoted: msg });

    } catch (err) {
      await reply(`❌ Failed: ${err.message}`);
    } finally {
      await sock.sendPresenceUpdate('paused', from);
    }
  }
};
