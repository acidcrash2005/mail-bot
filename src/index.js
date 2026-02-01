import cron from 'node-cron';
import { config, validateConfig } from './config.js';
import { fetchNewEmails } from './services/gmail.js';
import { translate } from './services/translator.js';
import { sendEmail } from './services/telegram.js';
import { logger } from './utils/logger.js';

let isProcessing = false;

async function processEmails() {
  // Защита от параллельного выполнения
  if (isProcessing) {
    logger.debug('Предыдущая проверка ещё выполняется, пропускаем');
    return;
  }

  isProcessing = true;

  try {
    logger.info('Проверка почты...');

    const emails = await fetchNewEmails(config.filter.fromEmail);

    if (emails.length === 0) {
      logger.info('Новых писем нет');
      return;
    }

    logger.info(`Обработка ${emails.length} писем...`);

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      logger.info(`--- Письмо ${i + 1}/${emails.length}: "${email.subject}" ---`);
      logger.info(`  От: ${email.from}, Дата: ${email.date}`);
      logger.info(`  Текст: ${email.text.length} символов, HTML: ${email.html.length} символов, Вложений: ${email.attachments.length}`);

      try {
        // Переводим текст письма
        const textToTranslate = email.text || email.html;
        if (textToTranslate) {
          logger.info(`  [1/2] Перевод...`);
          email.translatedText = await translate(textToTranslate);
          logger.info(`  [1/2] Перевод завершён (${email.translatedText.length} символов)`);
        } else {
          logger.warn(`  [1/2] Нет текста для перевода!`);
        }

        // Отправляем в Telegram
        logger.info(`  [2/2] Отправка в Telegram...`);
        await sendEmail(email);
        logger.info(`  [2/2] Отправка завершена`);

        logger.info(`✓ Письмо обработано успешно: "${email.subject}"`);
      } catch (error) {
        logger.error(`✗ Ошибка обработки письма "${email.subject}": ${error.message}`);
        logger.debug(`  Стек: ${error.stack}`);
      }
    }

    logger.info(`Обработка завершена. Отправлено: ${emails.length} писем`);
  } catch (error) {
    logger.error('Ошибка при проверке почты:', error.message);
  } finally {
    isProcessing = false;
  }
}

function gracefulShutdown(signal) {
  logger.info(`Получен сигнал ${signal}, завершение работы...`);
  process.exit(0);
}

async function main() {
  try {
    // Проверяем конфигурацию
    validateConfig();

    logger.info('='.repeat(50));
    logger.info('Mail Bot запущен');
    logger.info(`Фильтр: письма от ${config.filter.fromEmail}`);
    logger.info(`Telegram chat_id: ${config.telegram.chatId}`);
    logger.info(`Интервал проверки: ${config.checkIntervalMinutes} мин.`);
    logger.info('='.repeat(50));

    // Обработка сигналов завершения
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // Первая проверка сразу при запуске
    await processEmails();

    // Запуск cron для периодической проверки
    const cronExpression = `*/${config.checkIntervalMinutes} * * * *`;
    cron.schedule(cronExpression, processEmails);

    logger.info(`Cron запущен: каждые ${config.checkIntervalMinutes} минут`);
    logger.info('Нажмите Ctrl+C для остановки');
  } catch (error) {
    logger.error('Критическая ошибка:', error.message);
    process.exit(1);
  }
}

main();
