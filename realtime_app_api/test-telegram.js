const { sendTelegramMessage } = require('./utils/telegram');
sendTelegramMessage('Test message from server')
  .then(result => console.log('Kết quả:', result))
  .catch(error => console.error('Lỗi:', error.message));