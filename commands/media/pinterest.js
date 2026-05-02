/**
 * Pinterest Downloader - Download images/videos from Pinterest
 */

const axios = require('axios');
const config = require('../../config');

// Store processed message IDs to prevent duplicates
const processedMessages = new Set();

module.exports = {
  name: 'pinterest',
  aliases: ['pin', 'pindl', 'pinterestdl'],
  category: 'media',
  description: 'Download images/videos from Pinterest',
  usage: '.pinterest <Pinterest URL>',
  
  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    try {
      // Check if message has already been processed
      if (processedMessages.has(msg.key.id)) {
        return;
      }
      
      // Add message ID to processed set
      processedMessages.add(msg.key.id);
      
      // Clean up old message IDs after 5 minutes
      setTimeout(() => {
        processedMessages.delete(msg.key.id);
      }, 5 * 60 * 1000);
      
      const text = msg.message?.conversation || 
                   msg.message?.extendedTextMessage?.text ||
                   args.join(' ');
      
      if (!text) {
        return reply(
          '📌 *Pinterest Downloader*\n\n' +
          'Download images or videos from Pinterest.\n\n' +
          `Usage: ${config.prefix}pinterest <Pinterest URL>\n\n` +
          'Example:\n' +
          `${config.prefix}pinterest https://in.pinterest.com/pin/1109363320773690068/`
        );
      }
      
      // Extract URL from text - match Pinterest pin URLs (including pin.it shortened URLs)
      let urlMatch = text.match(/https?:\/\/[^\s]*pinterest[^\s]*\/pin\/[^\s]+/i);
      
      // Also match pin.it shortened URLs
      if (!urlMatch) {
        urlMatch = text.match(/https?:\/\/pin\.it\/[^\s]+/i);
      }
      
      // Match pin.it without https
      if (!urlMatch) {
        urlMatch = text.match(/pin\.it\/[^\s]+/i);
      }
      
      if (!urlMatch) {
        return reply('❌ Please provide a valid Pinterest pin URL!\n\nExamples:\n• https://in.pinterest.com/pin/1109363320773690068/\n• https://pin.it/dddddd\n• pin.it/dddddd');
      }
      
      const pinterestUrl = urlMatch[0];
      
      await sock.sendMessage(from, {
        react: { text: '📥', key: msg.key }
      });
      
      // Call Pinterest API
      const apiUrl = `https://api.nexray.web.id/downloader/pinterest?url=${encodeURIComponent(pinterestUrl)}`;
      
      let response;
      try {
        response = await axios.get(apiUrl, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
      } catch (error) {
        console.error('Pinterest API Error:', error);
        if (error.response) {
          const status = error.response.status;
          if (status === 400) {
            return reply('❌ Bad Request: Invalid Pinterest URL. Please check the link.');
          } else if (status === 429) {
            return reply('❌ Rate limit exceeded. Please try again later.');
          } else if (status === 500) {
            return reply('❌ Server error. Please try again later.');
          }
        }
        return reply('❌ Failed to fetch Pinterest content. Please try again.');
      }
      
      if (!response.data || !response.data.status || !response.data.result) {
        return reply('❌ Invalid response from API. The pin might not exist or be private.');
      }
      
      const pinData = response.data.result;
      
      console.log('Pinterest API Response:', JSON.stringify(pinData, null, 2));
      
      const isVideo = !!pinData.video;
      const imageUrl = pinData.video || pinData.image || pinData.url;
      const title = pinData.title || 'Pinterest Pin';
      const author = pinData.author || 'Unknown';
      
      if (!imageUrl) {
        console.error('Pinterest API response structure:', JSON.stringify(pinData, null, 2));
        return reply('❌ No media URL found in API response. The pin might be a video or have a different format.');
      }
      
      let caption = `📌 *${title}*\n\n`;
      if (author && author !== 'Unknown') {
        caption += `👤 Author: ${author}\n`;
      }
      caption += `\n*Downloaded by ${config.botName}*`;
      
      if (isVideo) {
        try {
          const videoResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 120000,
            maxContentLength: 100 * 1024 * 1024,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'video/mp4,video/*,*/*',
              'Referer': 'https://www.pinterest.com/'
            }
          });
          
          const videoBuffer = Buffer.from(videoResponse.data);
          
          if (!videoBuffer || videoBuffer.length === 0) {
            throw new Error('Empty video buffer');
          }
          if (videoBuffer.length < 100) {
            throw new Error('Video buffer too small, likely corrupted');
          }
          
          console.log(`Video downloaded successfully: ${(videoBuffer.length / 1024 / 1024).toFixed(2)}MB`);
          
          await sock.sendMessage(from, {
            video: videoBuffer,
            caption: caption
          }, { quoted: msg });
        } catch (videoError) {
          console.error('Video download/send error:', videoError.message);
          return reply('❌ Failed to download or send video. The video might be expired or require authentication.');
        }
      } else {
        await sock.sendMessage(from, {
          image: { url: imageUrl },
          caption: caption
        }, { quoted: msg });
      }
      
    } catch (error) {
      console.error('Error in pinterest command:', error);
      return reply(`❌ Error: ${error.message || 'Unknown error occurred'}`);
    }
  },
};
