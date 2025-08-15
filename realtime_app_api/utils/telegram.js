const TelegramBot = require('node-telegram-bot-api');
const { telegramBotToken, telegramChatId } = require('../config/telegram');
require('dotenv').config();

const bot = new TelegramBot(telegramBotToken, {
  polling: false,
});

const sendTelegramMessage = async (message, chatId = telegramChatId) => {
  try {
    await bot.sendMessage(chatId, message);
    console.log(`Đã gửi cảnh báo qua Telegram đến ${chatId}: ${message}`);
    return true;
  } catch (error) {
    console.error(`Lỗi gửi cảnh báo qua Telegram đến ${chatId}:`, error.message);
    return false;
  }
};

module.exports = { sendTelegramMessage };