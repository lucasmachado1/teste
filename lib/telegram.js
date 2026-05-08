const { requestJson } = require('./http');

function getTelegramConfig() {
  return {
    token: process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_API_ID || '',
    chatId: process.env.TELEGRAM_CHAT_ID || ''
  };
}

function hasTelegramConfig() {
  const config = getTelegramConfig();
  return Boolean(config.token && config.chatId);
}

async function sendTelegramMessage(text) {
  const { token, chatId } = getTelegramConfig();

  if (!token || !chatId) {
    throw new Error('Configure TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID antes de enviar alertas.');
  }

  return requestJson(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    })
  });
}

module.exports = {
  getTelegramConfig,
  hasTelegramConfig,
  sendTelegramMessage
};
