import 'dotenv/config';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function apiCall(method, params = {}) {
  const url = `${API_BASE}/${method}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return response.json();
}

async function main() {
  console.log('=== Тест Telegram бота ===\n');

  // Проверка переменных окружения
  if (!BOT_TOKEN) {
    console.log('✗ TELEGRAM_BOT_TOKEN не задан в .env');
    process.exit(1);
  }
  if (!CHAT_ID) {
    console.log('✗ TELEGRAM_CHAT_ID не задан в .env');
    process.exit(1);
  }

  // 1. Проверка токена бота (getMe)
  console.log('[1/3] Проверка токена бота (getMe)...');
  const meResult = await apiCall('getMe');

  if (!meResult.ok) {
    console.log(`  ✗ Ошибка: ${meResult.description}`);
    process.exit(1);
  }

  const bot = meResult.result;
  console.log(`  ✓ Бот: ${bot.first_name} (@${bot.username})\n`);

  // 2. Проверка chat_id (getChat)
  console.log('[2/3] Проверка chat_id (getChat)...');
  console.log(`  chat_id: ${CHAT_ID}`);

  const chatResult = await apiCall('getChat', { chat_id: CHAT_ID });

  if (!chatResult.ok) {
    console.log(`  ✗ Ошибка: ${chatResult.description}`);
    console.log('\n  Возможные причины:');
    console.log('  - Неверный chat_id');
    console.log('  - Бот не добавлен в канал/группу');
    console.log('  - Бот не имеет прав администратора в канале');
    process.exit(1);
  }

  const chat = chatResult.result;
  const chatName = chat.title || chat.first_name || chat.username || 'Без имени';
  console.log(`  ✓ Чат найден: "${chatName}" (тип: ${chat.type})\n`);

  // 3. Отправка тестового сообщения
  console.log('[3/3] Отправка тестового сообщения...');

  const testMessage = `🧪 Тестовое сообщение от mail-bot\n\nВремя: ${new Date().toISOString()}`;
  const sendResult = await apiCall('sendMessage', {
    chat_id: CHAT_ID,
    text: testMessage,
  });

  if (!sendResult.ok) {
    console.log(`  ✗ Ошибка: ${sendResult.description}`);
    console.log('\n  Возможные причины:');
    console.log('  - Бот не имеет прав на отправку сообщений');
    console.log('  - Бот был заблокирован пользователем');
    process.exit(1);
  }

  console.log(`  ✓ Сообщение отправлено (message_id: ${sendResult.result.message_id})\n`);

  console.log('=== Все проверки пройдены ===');
  console.log('Telegram работает корректно. Проверьте чат - там должно быть тестовое сообщение.');
}

main().catch((err) => {
  console.error('Неожиданная ошибка:', err.message);
  process.exit(1);
});
