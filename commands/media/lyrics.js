const axios = require('axios');
const yts = require('yt-search');

module.exports = {
  name: 'lyrics',
  aliases: [],
  category: 'media',
  description: 'Get lyrics of a song (searches automatically)',
  usage: '.lyrics Shape of You',

  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    const query = args.join(' ').trim();
    if (!query) return reply('❌ Provide a song name.');

    try {
      await sock.sendPresenceUpdate('composing', from);

      // Try direct lyrics from siputzx API (if available)
      let lyricsData = null;
      try {
        const { data } = await axios.get(`https://api.siputzx.my.id/api/s/lyrics?query=${encodeURIComponent(query)}`);
        if (data && data.lyrics) lyricsData = data;
      } catch {}

      if (lyricsData) {
        return reply(`🎵 *${lyricsData.title || query}*\n\n${lyricsData.lyrics}`);
      }

      // Fallback: search YouTube, get video title, then try a secondary lyrics API
      const search = await yts(query);
      if (!search.videos.length) return reply('❌ No matching song found.');
      const videoTitle = search.videos[0].title;

      // Use a free lyrics service (e.g., lyrics.ovh or another)
      try {
        const { data: lyData } = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(videoTitle)}`);
        if (lyData && lyData.lyrics) {
          return reply(`🎵 *${videoTitle}*\n\n${lyData.lyrics}`);
        }
      } catch {}

      // If everything fails, inform the user
      return reply('❌ Lyrics not found. Try different keywords.');
    } catch (err) {
      return reply(`❌ ${err.message}`);
    } finally {
      await sock.sendPresenceUpdate('paused', from);
    }
  }
};
