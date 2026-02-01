import 'dotenv/config';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const FILTER_FROM_EMAIL = process.env.FILTER_FROM_EMAIL || '702mariana@gmail.com';
const MAX_EMAILS = 5;

async function main() {
  console.log('=== Диагностика парсинга писем ===\n');

  // Проверка переменных окружения
  if (!GMAIL_USER) {
    console.log('✗ GMAIL_USER не задан в .env');
    process.exit(1);
  }
  if (!GMAIL_APP_PASSWORD) {
    console.log('✗ GMAIL_APP_PASSWORD не задан в .env');
    process.exit(1);
  }

  console.log(`Gmail: ${GMAIL_USER}`);
  console.log(`Фильтр по отправителю: ${FILTER_FROM_EMAIL}`);
  console.log(`Максимум писем: ${MAX_EMAILS}\n`);

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
    logger: false,
  });

  try {
    console.log('Подключение к Gmail...');
    await client.connect();
    console.log('✓ Подключено\n');

    // Выведем список папок
    console.log('Список папок Gmail:');
    const folders = await client.list();
    for (const folder of folders) {
      console.log(`  ${folder.path} ${folder.specialUse || ''}`);
    }
    console.log('');

    // Проверим несколько папок (Marianna - лейбл с письмами)
    const foldersToCheck = ['Marianna', 'INBOX', '[Gmail]/Вся почта'];

    for (const folderPath of foldersToCheck) {
      console.log(`\n========================================`);
      console.log(`=== Проверяем папку: ${folderPath} ===`);
      console.log(`========================================`);

      let lock;
      try {
        lock = await client.getMailboxLock(folderPath);
      } catch (e) {
        console.log(`  Не удалось открыть папку: ${e.message}`);
        continue;
      }

      try {
        console.log(`Mailbox status: ${client.mailbox?.exists || 0} писем в папке`);
        console.log(`Поиск писем от: ${FILTER_FROM_EMAIL}`);

        const uids = await client.search({ from: FILTER_FROM_EMAIL }, { uid: true });

        if (uids.length === 0) {
          console.log('Писем от этого отправителя не найдено');
          continue;
        }

        console.log(`Найдено: ${uids.length} писем (показываем последние ${MAX_EMAILS})\n`);

        // Берём последние N писем (самые новые в конце)
        const lastUids = uids.slice(-MAX_EMAILS);
        let successCount = 0;
        let failCount = 0;
        let index = 0;

        console.log(`UIDs для запроса: ${lastUids.join(', ')}\n`);

        // Сначала попробуем получить только envelope без source
        console.log('--- Проверка доступности писем (только envelope) ---');
        let envelopeCount = 0;
        for await (const msg of client.fetch(lastUids, { envelope: true, uid: true })) {
          envelopeCount++;
          console.log(`  UID ${msg.uid}: ${msg.envelope?.subject || '(нет темы)'}`);
        }
        console.log(`Получено envelope: ${envelopeCount}\n`);

        if (envelopeCount === 0) {
          console.log('Письма недоступны через fetch(). Используем fetchOne()...\n');
        }

        console.log('--- Получаем source через fetchOne ---\n');

        // Используем fetchOne вместо fetch - он работает
        for (const uid of lastUids) {
          index++;
          console.log(`[${index}/${lastUids.length}] UID ${uid}`);

          const message = await client.fetchOne(uid, { source: true }, { uid: true });

          if (!message) {
            console.log('  ✗ fetchOne вернул null');
            failCount++;
            console.log('');
            continue;
          }

          try {
            // Детальная диагностика что вернулось
            console.log(`  message keys: ${Object.keys(message).join(', ')}`);

            if (!message.source) {
              console.log('  ✗ message.source отсутствует');
              failCount++;
              console.log('');
              continue;
            }

            const sourceSize = message.source.length;
            console.log(`  Source размер: ${sourceSize} байт`);

            // Пробуем распарсить
            try {
              const parsed = await simpleParser(message.source);

              console.log('  ✓ Парсинг успешен');
              console.log(`  Тема: "${parsed.subject || '(без темы)'}"`);
              console.log(`  От: ${parsed.from?.text || '(нет)'}`);
              console.log(`  Дата: ${parsed.date || '(нет)'}`);
              console.log(`  Текст: ${parsed.text?.length || 0} символов`);
              console.log(`  HTML: ${parsed.html?.length || 0} символов`);
              console.log(`  Вложений: ${parsed.attachments?.length || 0}`);

              if (parsed.attachments && parsed.attachments.length > 0) {
                for (const att of parsed.attachments) {
                  console.log(`    - ${att.filename || 'без имени'} (${att.contentType}, ${att.size} байт)`);
                }
              }

              successCount++;
            } catch (parseError) {
              console.log(`  ✗ Ошибка парсинга: ${parseError.message}`);
              console.log(`  Стек: ${parseError.stack?.split('\n').slice(0, 3).join('\n  ')}`);

              // Показываем начало raw source для диагностики
              const rawPreview = message.source.toString('utf8').slice(0, 500);
              console.log('\n  Raw source (первые 500 байт):');
              console.log('  ---');
              console.log('  ' + rawPreview.split('\n').join('\n  '));
              console.log('  ---');

              failCount++;
            }
          } catch (fetchError) {
            console.log(`  ✗ Ошибка обработки письма: ${fetchError.message}`);
            failCount++;
          }

          console.log('');
        }

        if (index === 0) {
          console.log('  ✗ fetch итератор не вернул ни одного письма');
          console.log('  Возможно письма были удалены или UIDs недействительны');
          failCount = lastUids.length;
        }

        console.log('--- Итоги для папки ---');
        console.log(`Успешно распарсено: ${successCount}`);
        console.log(`Ошибок: ${failCount}`);

        if (successCount > 0) {
          console.log('\n✓ Парсинг работает! Проблема может быть в другом месте.');
        }
      } finally {
        lock.release();
      }
    }
  } catch (error) {
    console.log(`\n✗ Ошибка: ${error.message}`);
    if (error.message.includes('Invalid credentials')) {
      console.log('\nПроверьте:');
      console.log('- GMAIL_USER - правильный email');
      console.log('- GMAIL_APP_PASSWORD - пароль приложения (не обычный пароль)');
      console.log('- Создать пароль приложения: https://myaccount.google.com/apppasswords');
    }
    process.exit(1);
  } finally {
    await client.logout();
    console.log('\nОтключено от Gmail');
  }
}

main().catch((err) => {
  console.error('Неожиданная ошибка:', err.message);
  process.exit(1);
});
