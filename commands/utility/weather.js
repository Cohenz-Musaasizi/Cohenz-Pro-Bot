/**
 * Weather Command - Get weather information using OpenWeather API
 */

const axios = require('axios');

module.exports = {
  name: 'weather',
  aliases: ['w', 'clima'],
  category: 'utility',
  description: 'Get weather for a city',
  usage: '.weather <city>',
  
  async execute(sock, msg, args, context) {
    const { from, reply } = context;
    try {
      if (args.length === 0) {
        return reply('❌ Usage: .weather <city>\n\nExample: .weather London');
      }
      
      const city = args.join(' ');
      const apiKey = '4902c0f2550f58298ad4146a92b65e10';
      
      const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`);
      const weather = response.data;
      
      const weatherText = `Weather in ${weather.name}: ${weather.weather[0].description}. Temperature: ${weather.main.temp}°C.`;
      
      await sock.sendMessage(from, { text: weatherText }, { quoted: msg });
      
    } catch (error) {
      console.error('Error fetching weather:', error);
      reply('Sorry, I could not fetch the weather right now.');
    }
  }
};
