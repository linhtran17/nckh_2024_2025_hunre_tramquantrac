// utils/discord.js
const { Client, GatewayIntentBits, Events } = require('discord.js');
require('dotenv').config();

const TOKEN = process.env.DISCORD_BOT_TOKEN;       // KHÔNG thêm "Bot " ở trước
const DEFAULT_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

let client = null;
let isReady = false;
let loginTried = false;

/** Khởi động client 1 lần, không để app crash nếu thiếu/sai token */
function bootClientOnce() {
  if (loginTried) return;         // tránh login lặp
  loginTried = true;

  if (!TOKEN) {
    console.warn('[Discord] DISCORD_BOT_TOKEN chưa được set -> bỏ qua gửi Discord');
    return; // không tạo client để tránh login lỗi
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages, // đủ để fetch channel & send
      // Không cần MessageContent nếu chỉ gửi tin
    ],
  });

  client.once(Events.ClientReady, (c) => {
    isReady = true;
    console.log(`[Discord] Logged in as ${c.user.tag}`);
  });

  client.login(TOKEN).catch((err) => {
    // KHÔNG throw để khỏi làm app crash
    console.error('[Discord] Login failed:', err?.message || err);
    client = null;
    isReady = false;
  });
}

/**
 * Gửi tin nhắn Discord.
 * - Tự khởi động client nếu chưa chạy.
 * - Trả về true/false, KHÔNG ném lỗi để không làm app chết.
 */
async function sendDiscordMessage(message, channelId = DEFAULT_CHANNEL_ID) {
  try {
    // Khởi động nếu chưa
    bootClientOnce();

    // Nếu không có token hoặc client chưa sẵn sàng → bỏ qua nhẹ nhàng
    if (!client) {
      console.warn('[Discord] Client chưa sẵn sàng (thiếu token hoặc login fail) → bỏ qua gửi.');
      return false;
    }
    if (!isReady) {
      // Chờ tối đa ~5s cho lần khởi động đầu
      await new Promise((r) => setTimeout(r, 500));
      if (!isReady) {
        console.warn('[Discord] Client chưa ready → bỏ qua gửi lần này.');
        return false;
      }
    }

    if (!channelId) {
      console.warn('[Discord] DISCORD_CHANNEL_ID chưa set → bỏ qua gửi.');
      return false;
    }

    const channel = await client.channels.fetch(channelId);
    await channel.send(message);
    console.log(`[Discord] Sent to ${channelId}: ${message}`);
    return true;
  } catch (err) {
    console.error('[Discord] Send error:', err?.message || err);
    return false;
  }
}

module.exports = { sendDiscordMessage };
