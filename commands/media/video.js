// commands/media/video.js
const axios = require('axios');

const PLATFORMS = {
  youtube:     'ytmp4',
  instagram:   'igdl',
  tiktok:      'tiktok',
  facebook:    'fbdl',
  twitter:     'twitterdl',
};

module.exports = {
  name: 'video',
  aliases: ['dlvideo', 'getvideo', 'downloadvideo'],
  category: 'media',
  description: 'Download video from YouTube, IG, TikTok, FB, Twitter by link',
  usage: '.video https://instagram.com/p/xxx  (or .video https://youtu.be/xxx)',

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    const url = args[0];
    if (!url || !/^https?:\/\//i.test(url)) return reply('❌ Provide a valid link.\nExample: .video https://youtu.be/xxx');

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
