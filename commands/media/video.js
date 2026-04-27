const yts = require('yt-search');
const axios = require('axios');

const PLATFORMS = {
  youtube:   'ytmp4',
  instagram: 'igdl',
  tiktok:    'tiktok',
  facebook:  'fbdl',
  twitter:   'twitterdl',
};

module.exports = {
  name: 'video',
  aliases: ['dlvideo', 'getvideo'],
  category: 'media',
  description: 'Download video from any platform (with YouTube search)',
  usage: '.video https://instagram.com/p/...  (or .video Fik Fameica new song)',

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    const input = args.join(' ').trim();
    if (!input) return reply('❌ Provide a link or search phrase.');

    let url = input;
    // If it's a direct link, use it; otherwise, search YouTube
    if (!/^https?:\/\//i.test(input)) {
      try {
        const search = await yts(input);
        if (!search.videos.length) throw new Error('No results');
        url = search.videos[0].url;
        await reply(`🔍 Found: *${search.videos[0].title}*`);
      } catch (err) {
        return reply('❌ Could not find any video for that name.');
      }
    }

    // Detect platform from the URL
    const u = url.toLowerCase();
    let platform = 'youtube';
    if (u.includes('instagram.com')) platform = 'instagram';
    else if (u.includes('tiktok.com')) platform = 'tiktok';
    else if (u.includes('facebook.com') || u.includes('fb.watch')) platform = 'facebook';
    else if (u.includes('twitter.com') || u.includes('x.com')) platform = 'twitter';

    try {
      await sock.sendPresenceUpdate('composing', from);
      const { data } = await axios.get(`https://api.siputzx.my.id/api/d/${PLATFORMS[platform]}?url=${encodeURIComponent(url)}`);
      const videoUrl = data?.url || data?.data?.download_url || data?.data?.url || data?.data?.video_url;
      if (!videoUrl) throw new Error('No video link returned');
      await sock.sendMessage(from, { video: { url: videoUrl } }, { quoted: msg });
    } catch (err) {
      await reply(`❌ Failed: ${err.message}`);
    } finally {
      await sock.sendPresenceUpdate('paused', from);
    }
  }
};
