import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

const bot = new TelegramBot(config.telegram.botToken);

const MAX_MESSAGE_LENGTH = 4096;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

function formatDate(date) {
  return new Date(date).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function splitMessage(text, maxLength) {
  if (text.length <= maxLength) {
    return [text];
  }

  const parts = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      parts.push(remaining);
      break;
    }

    let splitIndex = remaining.lastIndexOf('\n', maxLength);
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      splitIndex = remaining.lastIndexOf(' ', maxLength);
    }
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      splitIndex = maxLength;
    }

    parts.push(remaining.substring(0, splitIndex));
    remaining = remaining.substring(splitIndex).trim();
  }

  return parts;
}

export async function sendEmail(email) {
  const chatId = config.telegram.chatId;
  logger.info(`Telegram: отправка в chat_id="${chatId}"`);
  logger.debug(`  Тип chat_id: ${typeof chatId}, длина: ${String(chatId).length}`);

  // Формируем заголовок
  const header = [
    `📧 <b>Новое письмо</b>`,
    `<b>От:</b> ${escapeHtml(email.from)}`,
    `<b>Тема:</b> ${escapeHtml(email.subject)}`,
    `<b>Дата:</b> ${formatDate(email.date)}`,
    '',
  ].join('\n');

  // Основной текст
  const body = email.translatedText || email.text || '(пустое письмо)';
  const fullMessage = header + escapeHtml(body);

  // Разбиваем на части если слишком длинное
  const messageParts = splitMessage(fullMessage, MAX_MESSAGE_LENGTH);

  // Отправляем текст
  for (let i = 0; i < messageParts.length; i++) {
    try {
      const result = await bot.sendMessage(chatId, messageParts[i], {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      });
      logger.info(`  ✓ Сообщение ${i + 1}/${messageParts.length} отправлено (message_id: ${result.message_id})`);

      // Небольшая задержка между сообщениями
      if (i < messageParts.length - 1) {
        await sleep(100);
      }
    } catch (error) {
      logger.error(`  ✗ Ошибка отправки сообщения в Telegram: ${error.message}`);
      if (error.response) {
        logger.error(`    Ответ API: ${JSON.stringify(error.response.body || error.response)}`);
      }
      throw error;
    }
  }

  // Отправляем вложения
  if (email.attachments && email.attachments.length > 0) {
    for (const attachment of email.attachments) {
      try {
        if (attachment.size > MAX_FILE_SIZE) {
          await bot.sendMessage(
            chatId,
            `⚠️ Файл "${attachment.filename}" слишком большой (${Math.round(attachment.size / 1024 / 1024)} MB). Лимит Telegram: 50 MB.`
          );
          continue;
        }

        const docResult = await bot.sendDocument(
          chatId,
          attachment.content,
          {},
          {
            filename: attachment.filename,
            contentType: attachment.contentType,
          }
        );

        logger.info(`  ✓ Файл отправлен: ${attachment.filename} (message_id: ${docResult.message_id})`);
        await sleep(100);
      } catch (error) {
        logger.error(`  ✗ Ошибка отправки файла ${attachment.filename}: ${error.message}`);
        if (error.response) {
          logger.error(`    Ответ API: ${JSON.stringify(error.response.body || error.response)}`);
        }
        await bot.sendMessage(
          chatId,
          `⚠️ Не удалось отправить файл: ${attachment.filename}`
        );
      }
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
