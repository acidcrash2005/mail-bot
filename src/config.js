import 'dotenv/config';

export const config = {
  gmail: {
    user: process.env.GMAIL_USER,
    password: process.env.GMAIL_APP_PASSWORD,
    host: 'imap.gmail.com',
    port: 993,
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  },
  filter: {
    fromEmail: process.env.FILTER_FROM_EMAIL || '702mariana@gmail.com',
  },
  checkIntervalMinutes: parseInt(process.env.CHECK_INTERVAL_MINUTES, 10) || 2,
};

export function validateConfig() {
  const required = [
    ['GMAIL_USER', config.gmail.user],
    ['GMAIL_APP_PASSWORD', config.gmail.password],
    ['TELEGRAM_BOT_TOKEN', config.telegram.botToken],
    ['TELEGRAM_CHAT_ID', config.telegram.chatId],
  ];

  const missing = required.filter(([, value]) => !value).map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Отсутствуют обязательные переменные окружения: ${missing.join(', ')}\nСкопируйте .env.example в .env и заполните значения.`);
  }
}
