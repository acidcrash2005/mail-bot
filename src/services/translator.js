import axios from 'axios';
import { logger } from '../utils/logger.js';

// Список публичных серверов Lingva Translate (fallback)
const LINGVA_SERVERS = [
  'https://lingva.ml',
  'https://translate.plausibility.cloud',
  'https://lingva.garuber.eu',
];

const MAX_CHUNK_SIZE = 5000;

function splitText(text, maxLength) {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Ищем последний перенос строки или пробел в пределах лимита
    let splitIndex = remaining.lastIndexOf('\n', maxLength);
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      splitIndex = remaining.lastIndexOf(' ', maxLength);
    }
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      splitIndex = maxLength;
    }

    chunks.push(remaining.substring(0, splitIndex));
    remaining = remaining.substring(splitIndex).trim();
  }

  return chunks;
}

function stripHtml(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function translateChunk(text, from, to, serverUrl) {
  const encodedText = encodeURIComponent(text);
  const url = `${serverUrl}/api/v1/${from}/${to}/${encodedText}`;

  const response = await axios.get(url, {
    timeout: 30000,
    headers: {
      'User-Agent': 'MailBot/1.0',
    },
  });

  return response.data.translation;
}

export async function translate(text, from = 'auto', to = 'ru') {
  if (!text || text.trim().length === 0) {
    return '';
  }

  // Очищаем HTML если есть
  const cleanText = text.includes('<') ? stripHtml(text) : text;

  if (cleanText.trim().length === 0) {
    return '';
  }

  const chunks = splitText(cleanText, MAX_CHUNK_SIZE);
  const translatedChunks = [];

  const preview = cleanText.substring(0, 100).replace(/\n/g, ' ');
  logger.info(`Перевод: ${chunks.length} частей, текст: "${preview}${cleanText.length > 100 ? '...' : ''}"`);

  for (const chunk of chunks) {
    let translated = null;
    let lastError = null;

    // Пробуем каждый сервер по очереди
    for (const server of LINGVA_SERVERS) {
      try {
        translated = await translateChunk(chunk, from, to, server);
        logger.info(`  ✓ Часть ${chunks.indexOf(chunk) + 1}/${chunks.length} переведена через ${server}`);
        break;
      } catch (error) {
        lastError = error;
        logger.warn(`  → Сервер ${server} недоступен: ${error.message}`);
      }
    }

    if (translated) {
      translatedChunks.push(translated);
    } else {
      logger.warn('Не удалось перевести текст, используется оригинал');
      translatedChunks.push(`[Не удалось перевести]\n${chunk}`);
    }
  }

  const result = translatedChunks.join('\n');
  const resultPreview = result.substring(0, 100).replace(/\n/g, ' ');
  logger.info(`Перевод завершён: "${resultPreview}${result.length > 100 ? '...' : ''}"`);

  return result;
}
