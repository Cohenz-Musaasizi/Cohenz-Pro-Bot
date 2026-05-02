/**
 * Video Downloader - Download video from YouTube (smart search)
 */
const yts = require('yt-search');
const axios = require('axios');
const APIs = require('../../utils/api');
const config = require('../../config');

module.exports = {
  name: 'video',
  aliases: ['ytvideo', 'ytv', 'ytmp4', 'ytvid'],
  category: 'media',
  description: 'Download video from YouTube',
  usage: '.video <video name or YouTube link>',

  async execute(sock, msg, args) {
    try {
      const text = args.join(' ').trim();
      const chatId = msg.key.remoteJid;

      if (!text) {
        return await sock.sendMessage(chatId, {
          text: '❌ What video do you want to download? Example: .video Fik Fameica new song'
        }, { quoted: msg });
      }

      let videoUrl = '';
      let videoTitle = '';
      let videoThumbnail = '';

      // 1. If it's a direct YouTube link, use it
      if (text.includes('youtube.com') || text.includes('youtu.be')) {
        videoUrl = text;
      } else {
        // 2. Otherwise search YouTube and pick the best match
        const search = await yts(text);
        if (!search || !search.videos.length) {
          return await sock.sendMessage(chatId, {
            text: '❌ No videos found for that name.'
          }, { quoted: msg });
        }
        const vid = search.videos[0];
        videoUrl = vid.url;
        videoTitle = vid.title;
        videoThumbnail = vid.thumbnail;
      }

      // 3. Send thumbnail immediately (if available)
      if (videoThumbnail) {
        try {
          await sock.sendMessage(chatId, {
            image: { url: videoThumbnail },
            caption: `🎬 Downloading: *${videoTitle || 'your video'}*`
          }, { quoted: msg });
        } catch (e) {}
      }

      // 4. Try multiple reliable video download APIs (same ones used for song)
      let videoData;
      const downloaders = [
        { name: 'EliteProTech', method: () => APIs.getEliteProTechVideoByUrl(videoUrl) },
        { name: 'Yupra',        method: () => APIs.getYupraVideoByUrl(videoUrl) },
        { name: 'Okatsu',       method: () => APIs.getOkatsuVideoByUrl(videoUrl) },
      ];

      for (const dl of downloaders) {
        try {
          videoData = await dl.method();
          if (videoData && videoData.download) {
            break;   // success
          }
        } catch (e) {
          console.log(`${dl.name} video API failed, trying next…`);
        }
      }

      if (!videoData || !videoData.download) {
        return await sock.sendMessage(chatId, {
          text: '❌ All download sources failed. The video may be unavailable or blocked.'
        }, { quoted: msg });
      }

      // 5. Send the video
      await sock.sendMessage(chatId, {
        video: { url: videoData.download },
        mimetype: 'video/mp4',
        fileName: `${(videoData.title || videoTitle || 'video').replace(/[^\w\s-]/g, '')}.mp4`,
        caption: `🎬 *${videoData.title || videoTitle || 'Video'}*\n\n> _Downloaded by ${config.botName || 'KnightBot'}_`
      }, { quoted: msg });

    } catch (error) {
      console.error('[VIDEO] Error:', error?.message || error);
      await sock.sendMessage(msg.key.remoteJid, {
        text: '❌ Download failed: ' + (error?.message || 'Unknown error')
      }, { quoted: msg });
    }
  }
};
