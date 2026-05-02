// commands/instagram.js – Instagram media downloader (compatible with new handler)
const { igdl } = require('ruhend-scraper');
const axios = require('axios');

module.exports = {
  name: 'instagram',
  aliases: ['ig', 'insta', 'igdl', 'reels', 'igsc', 'igc', 'igsquare'],  // all aliases in one place
  category: 'media',
  description: 'Download Instagram photos/videos/reels',
  usage: '.instagram <link> (or .ig, .igsc, etc.)',

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    const input = args.join(' ').trim();
    const urlMatch = input.match(/https?:\/\/\S+/);
    if (!urlMatch) return reply('❌ Please provide an Instagram link.\nExample: .instagram https://www.instagram.com/p/...');

    try {
      const data = await igdl(urlMatch[0]);
      if (!data || !data.data || data.data.length === 0) return reply('❌ No media found at the link. It might be private or invalid.');

      // Send up to 10 media items (images/videos)
      let count = 0;
      for (const media of data.data) {
        if (count >= 10) break;
        const url = media.url || media.downloadUrl || media.mediaUrl;
        if (!url) continue;

        const isVideo = media.type === 'video' || /\.(mp4|mov|avi|mkv|webm)$/i.test(url);

        await sock.sendMessage(from, {
          [isVideo ? 'video' : 'image']: { url },
          caption: `📸 Instagram`
        }, { quoted: msg });

        count++;
        // Small delay to avoid rate limits
        if (count < data.data.length) await new Promise(r => setTimeout(r, 800));
      }

    } catch (err) {
      console.error('Instagram error:', err);
      reply('❌ Failed to download Instagram media.');
    }
  }
};
