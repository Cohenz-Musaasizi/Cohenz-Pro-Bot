const yts = require('yt-search');
const axios = require('axios');
const config = require('../../config');

module.exports = {
  name: 'lyrics',
  aliases: ['lyric', 'lirik'],
  category: 'media',
  description: 'Get lyrics of a song (smart search)',
  usage: '.lyrics <song name>',

  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    const songTitle = args.join(' ').trim();
    if (!songTitle) {
      return await sock.sendMessage(chatId, { 
        text: `❌ Please provide a song name!\n\nExample: ${config.prefix}lyrics Despacito` 
      });
    }

    try {
      // 1. Search YouTube for the best matching video title
      const search = await yts(songTitle);
      if (!search.videos.length) {
        return await sock.sendMessage(chatId, { 
          text: '❌ Could not find any matching song on YouTube.' 
        });
      }

      // Use the title of the top result, cleaning common noise words
      let bestTitle = search.videos[0].title
        .replace(/\(.*?\)|\[.*?\]/g, '')   // remove brackets and their content
        .replace(/official.*|music.*|video.*|lyric.*|audio.*/gi, '')
        .trim();

      // Show which song was matched
      await sock.sendMessage(chatId, { 
        text: `🔍 Searching lyrics for: *${bestTitle}*…` 
      });

      let lyricsData = null;

      // 2. Try multiple lyrics APIs in sequence
      // API 1: lyrics.ovh (free, no key)
      try {
        const res = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(bestTitle)}`);
        if (res.data && res.data.lyrics) {
          lyricsData = {
            title: bestTitle,
            artist: '',
            lyrics: res.data.lyrics,
            thumbnail: ''
          };
        }
      } catch (err) {
        console.log('lyrics.ovh failed, trying next…');
      }

      // API 2: some-random-api.ml (free, returns JSON)
      if (!lyricsData) {
        try {
          const res = await axios.get(`https://some-random-api.ml/lyrics?title=${encodeURIComponent(bestTitle)}`);
          if (res.data && res.data.lyrics) {
            lyricsData = {
              title: res.data.title || bestTitle,
              artist: res.data.author || '',
              lyrics: res.data.lyrics,
              thumbnail: res.data.thumbnail?.genius || ''
            };
          }
        } catch (err) {
          console.log('some-random-api failed, trying next…');
        }
      }

      // API 3: genius-lyrics-api via Heroku (fallback)
      if (!lyricsData) {
        try {
          const res = await axios.get(`https://genius-lyrics-api.herokuapp.com/search?q=${encodeURIComponent(bestTitle)}`);
          if (res.data && res.data.length > 0 && res.data[0].lyrics) {
            lyricsData = {
              title: res.data[0].title,
              artist: res.data[0].artist,
              lyrics: res.data[0].lyrics,
              thumbnail: res.data[0].thumbnail || ''
            };
          }
        } catch (err) {
          console.log('genius-lyrics-api failed');
        }
      }

      if (!lyricsData) {
        return await sock.sendMessage(chatId, { 
          text: '❌ Could not find lyrics for this song. It may not be in our databases yet.' 
        });
      }

      // 3. Format and send the lyrics
      let lyrics = lyricsData.lyrics;
      if (lyrics.length > 4000) {
        lyrics = lyrics.substring(0, 4000) + '…\n\n_Lyrics too long, showing first part only_';
      }

      const caption = `🎵 *${lyricsData.title}*\n` +
                     `👤 *Artist:* ${lyricsData.artist || 'Unknown'}\n\n` +
                     `📝 *Lyrics:*\n${lyrics}\n\n` +
                     `_Fetched by ${config.botName || 'KnightBot'}_`;

      if (lyricsData.thumbnail) {
        await sock.sendMessage(chatId, {
          image: { url: lyricsData.thumbnail },
          caption: caption
        });
      } else {
        await sock.sendMessage(chatId, { text: caption });
      }

    } catch (error) {
      console.error('Lyrics command error:', error);
      await sock.sendMessage(chatId, { 
        text: '❌ An error occurred while fetching lyrics. Please try again later.' 
      });
    }
  }
};
