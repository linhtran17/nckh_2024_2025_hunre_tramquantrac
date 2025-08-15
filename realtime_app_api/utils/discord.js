const { Client, IntentsBitField } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
  ],
});

client.login(process.env.DISCORD_BOT_TOKEN);

client.on('ready', () => {
  console.log(`Đăng nhập Discord thành công: ${client.user.tag}`);
});

const sendDiscordMessage = async (message, channelId = process.env.DISCORD_CHANNEL_ID) => {
  try {
    const channel = await client.channels.fetch(channelId);
    await channel.send(message);
    console.log(`Đã gửi cảnh báo qua Discord đến kênh ${channelId}: ${message}`);
    return true;
  } catch (error) {
    console.error(`Lỗi gửi cảnh báo qua Discord đến kênh ${channelId}:`, error.message);
    return false;
  }
};

module.exports = { sendDiscordMessage };