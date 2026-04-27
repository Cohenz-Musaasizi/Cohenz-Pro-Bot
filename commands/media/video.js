// commands/media/video.js – Smart video download with multi‑fallback
const yts = require('yt-search');
const axios = require('axios');

// Extract YouTube video ID (used for thumbnail)
const getYouTubeId = (url) => {
  const match = url.match(/(?:youtu\.be\/|watch\?v=|\/embed\/|\/v\/|\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

const getThumbnail = (url) => {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
};

// Platform‑specific downloader sets
const DOWNLOADERS = {
  youtube: [
    {
      name: 'siputzx',
      url: (vu) => `https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(vu)}`,
      extract: (d) => d?.url || d?.data?.download_url || d?.data?.url || d?.data?.video_url,
    },
    {
      name: 'yupra',
      url: (vu) => `https://api.yupra.my.id/api/downloader/ytmp4?url=${encodeURIComponent(vu)}`,
      extract: (d) => d?.data?.download_url || d?.data?.url || d?.data?.video_url,
    },
    {
      name: 'okatsu',
      url: (vu) => `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp4?url=${encodeURIComponent(vu)}`,
      extract: (d) => d?.result?.mp4 || d?.download || d?.url || d?.data?.url,
    },
    {
      name: 'eliteprotech',
      url: (vu) => `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(vu)}&format=mp4`,
      extract: (d) => d?.downloadURL || d?.data?.downloadURL,
    },
  ],
  instagram: [
    {
      name: 'siputzx',
      url: (vu) => `https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(vu)}`,
      extract: (d) => d?.url || d?.data?.download_url || d?.data?.url || d?.data?.video_url,
    },
  ],
  tiktok: [
    {
      name: 'siputzx',
      url: (vu) => `https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(vu)}`,
      extract: (d) => d?.url || d?.data?.download_url || d?.data?.url || d?.data?.video_url,
    },
  ],
  facebook: [
    {
      name: 'siputzx',
      url: (vu) => `https://api.siputzx.my.id/api/d/fbdl?url=${encodeURIComponent(vu)}`,
      extract: (d) => d?.url || d?.data?.download_url || d?.data?.url || d?.data?.video_url,
    },
  ],
  twitter: [
    {
      name: 'siputzx',
      url: (vu) => `https://api.siputzx.my.id/api/d/twitterdl?url=${encodeURIComponent(vu)}`,
      extract: (d) => d?.url || d?.data?.download_url || d?.data?.url || d?.data?.video_url,
    },
  ],
};

/**
 * Detect platform from a URL.
 * Returns 'youtube', 'instagram', 'tiktok', 'facebook', 'twitter', or null.
 */
function detectPlatform(url) {
  const u = url.toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('facebook.com') || u.includes('fb.watch')) return 'facebook';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
  return null;
}

module.exports = {
  name: 'video',
  aliases: ['dlvideo', 'getvideo'],
  category: 'media',
  description: 'Download video from any platform or search YouTube',
  usage: '.video https://instagram.com/p/...  (or .video Fik Fameica new song)',

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    const input = args.join(' ').trim();
    if (!input) return reply('❌ Provide a link or search phrase.');

    let url = input;
    let videoTitle = '';
    let thumbnailUrl = '';

    // If it's not a direct URL, search YouTube
    if (!/^https?:\/\//i.test(input)) {
      try {
        const search = await yts(input);
        if (!search.videos.length) throw new Error('No results');
        const vid = search.videos[0];
        url = vid.url;
        videoTitle = vid.title;
        thumbnailUrl = vid.thumbnail || getThumbnail(url);
        await reply(`🔍 Found: *${videoTitle}*`);
      } catch (err) {
        return reply('❌ Could not find any video.');
      }
    } else {
      // For direct links, try to get a thumbnail if YouTube
      thumbnailUrl = getThumbnail(url);
    }

    const platform = detectPlatform(url);
    if (!platform) return reply('❌ Unsupported link. Use YouTube, Instagram, TikTok, Facebook, or Twitter.');

    try {
      await sock.sendPresenceUpdate('composing', from);

      // 1. Send thumbnail if YouTube (optional, but nice)
      if (thumbnailUrl) {
        try {
          await sock.sendMessage(from, {
            image: { url: thumbnailUrl },
            caption: videoTitle ? `🎬 *${videoTitle}*` : '🎬 Your Video',
          }, { quoted: msg });
        } catch (e) {}
      }

      // 2. Try each downloader for the detected platform
      const downloaders = DOWNLOADERS[platform] || [];
      let downloadUrl = null;
      for (const dl of downloaders) {
        try {
          const { data } = await axios.get(dl.url(url), { timeout: 20000 });
          const extracted = dl.extract(data);
          if (extracted) {
            downloadUrl = extracted;
            break;
          }
        } catch (e) {}
      }

      if (!downloadUrl) throw new Error('All download services failed for this platform. Try again later.');

      // 3. Send video
      await sock.sendMessage(from, { video: { url: downloadUrl } }, { quoted: msg });

    } catch (err) {
      await reply(`❌ Failed: ${err.message}`);
    } finally {
      await sock.sendPresenceUpdate('paused', from);
    }
  }
};
