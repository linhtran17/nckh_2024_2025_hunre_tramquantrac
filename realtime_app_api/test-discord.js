const { Client, IntentsBitField } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
  ],
});

client.login(process.env.DISCORD_BOT_TOKEN);

client.on('ready', async () => {
  console.log(`Đăng nhập Discord thành công: ${client.user.tag}`);
  try {
    const channelId = process.env.DISCORD_CHANNEL_ID;
    const channel = await client.channels.fetch(channelId);
    await channel.send('Test bot Discord thành công!');
    console.log(`Đã gửi tin nhắn test đến kênh ${channelId}`);
  } catch (error) {
    console.error('Lỗi gửi tin nhắn test:', error.message);
  }
});