/**
 * Facebook Downloader - Download Facebook videos
 */

const { facebookdl } = require('@bochilteam/scraper-facebook');
const axios = require('axios');
const config = require('../../config');

// Store processed message IDs to prevent duplicates
const processedMessages = new Set();

module.exports = {
  name: 'facebook',
  aliases: ['fb', 'fbdl', 'facebookdl'],
  category: 'media',
  description: 'Download Facebook videos',
  usage: '.facebook <Facebook URL>',

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    try {
      // Check if message has already been processed
      if (processedMessages.has(msg.key.id)) return;
      processedMessages.add(msg.key.id);
      setTimeout(() => processedMessages.delete(msg.key.id), 5 * 60 * 1000);

      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        args.join(' ');

      if (!text) {
        return reply('Please provide a Facebook link for the video.');
      }

      // Extract URL from command
      const url = text.split(' ').slice(1).join(' ').trim();
      if (!url) {
        return reply('Please provide a Facebook link for the video.');
      }

      // Validate URL
      const facebookPatterns = [
        /https?:\/\/(?:www\.|m\.)?facebook\.com\//,
        /https?:\/\/(?:www\.|m\.)?fb\.com\//,
        /https?:\/\/fb\.watch\//,
        /https?:\/\/(?:www\.)?facebook\.com\/watch/,
        /https?:\/\/(?:www\.)?facebook\.com\/.*\/videos\//,
      ];
      const isValidUrl = facebookPatterns.some(pattern => pattern.test(url));
      if (!isValidUrl) {
        return reply('That is not a valid Facebook link. Please provide a valid Facebook video link.');
      }

      await sock.sendMessage(from, {
        react: { text: '🔄', key: msg.key },
      });

      try {
        const data = await facebookdl(url);
        if (!data || !data.video || !Array.isArray(data.video) || data.video.length === 0) {
          throw new Error('No video data found');
        }

        const videoOption = data.video[0];
        if (!videoOption || !videoOption.download) {
          throw new Error('No video download function found');
        }

        const videoData = await videoOption.download();
        let videoUrl = null;
        let videoBuffer = null;

        if (typeof videoData === 'string') {
          videoUrl = videoData;
        } else if (Buffer.isBuffer(videoData)) {
          videoBuffer = videoData;
        } else if (videoData && videoData.url) {
          videoUrl = videoData.url;
        } else if (videoData && videoData.data) {
          videoBuffer = Buffer.from(videoData.data);
        } else {
          throw new Error('Invalid video data format');
        }

        const botName = config.botName.toUpperCase();
        let caption = `*DOWNLOADED BY ${botName}*`;
        const parts = [];
        if (data.duration) parts.push(`⏱️ Duration: ${data.duration}`);
        if (videoOption.quality) parts.push(`📹 Quality: ${videoOption.quality}`);
        if (parts.length > 0) caption += '\n\n' + parts.join('\n');

        if (videoBuffer) {
          await sock.sendMessage(from, {
            video: videoBuffer,
            mimetype: 'video/mp4',
            caption: caption,
          }, { quoted: msg });
        } else if (videoUrl) {
          try {
            await sock.sendMessage(from, {
              video: { url: videoUrl },
              mimetype: 'video/mp4',
              caption: caption,
            }, { quoted: msg });
          } catch (urlError) {
            console.error('URL send failed, trying buffer method:', urlError.message);
            const videoResponse = await axios.get(videoUrl, {
              responseType: 'arraybuffer',
              timeout: 60000,
              maxContentLength: 100 * 1024 * 1024,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.facebook.com/',
              },
            });
            const buffer = Buffer.from(videoResponse.data);
            await sock.sendMessage(from, {
              video: buffer,
              mimetype: 'video/mp4',
              caption: caption,
            }, { quoted: msg });
          }
        } else {
          throw new Error('No video URL or buffer found');
        }
      } catch (error) {
        console.error('Error in Facebook download:', error);
        reply(`❌ Failed to download Facebook video.\n\nError: ${error.message}\n\nPlease try again with a different link.`);
      }
    } catch (error) {
      console.error('Error in Facebook command:', error);
      reply('An error occurred while processing the request. Please try again later.');
    }
  },
};
