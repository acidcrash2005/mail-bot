import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

export async function fetchNewEmails(fromEmail) {
  const client = new ImapFlow({
    host: config.gmail.host,
    port: config.gmail.port,
    secure: true,
    auth: {
      user: config.gmail.user,
      pass: config.gmail.password,
    },
    logger: false,
  });

  const emails = [];

  try {
    await client.connect();
    logger.debug('Подключено к Gmail IMAP');

    const lock = await client.getMailboxLock('INBOX');

    try {
      // Поиск непрочитанных писем от указанного отправителя
      const searchCriteria = {
        seen: false,
        from: fromEmail,
      };

      const uids = await client.search(searchCriteria, { uid: true });

      if (uids.length === 0) {
        logger.debug('Новых писем не найдено');
        return emails;
      }

      logger.info(`Найдено ${uids.length} новых писем`);

      // Получаем содержимое каждого письма через fetchOne (fetch итератор не работает на больших mailbox)
      for (const uid of uids) {
        try {
          const message = await client.fetchOne(uid, { source: true }, { uid: true });

          if (!message || !message.source) {
            logger.error(`  ✗ Не удалось получить source письма UID ${uid}`);
            continue;
          }

          const parsed = await simpleParser(message.source);

          const email = {
            uid: uid,
            subject: parsed.subject || '(без темы)',
            from: parsed.from?.text || fromEmail,
            date: parsed.date || new Date(),
            text: parsed.text || '',
            html: parsed.html || '',
            attachments: (parsed.attachments || []).map((att) => ({
              filename: att.filename || 'attachment',
              contentType: att.contentType,
              content: att.content,
              size: att.size,
            })),
          };

          emails.push(email);
          logger.info(`  → Письмо UID ${uid}: "${email.subject}" (текст: ${email.text.length} символов, вложений: ${email.attachments.length})`);
        } catch (parseError) {
          logger.error(`  ✗ Ошибка парсинга письма UID ${uid}: ${parseError.message}`);
          logger.debug(`    Стек ошибки: ${parseError.stack}`);
        }
      }

      logger.info(`Успешно распарсено: ${emails.length} из ${uids.length} писем`);

      // Помечаем как прочитанные ТОЛЬКО успешно распарсенные письма
      const successUids = emails.map((e) => e.uid);
      if (successUids.length > 0) {
        await client.messageFlagsAdd(successUids, ['\\Seen'], { uid: true });
        logger.info(`Помечено как прочитанные: ${successUids.length} писем (UIDs: ${successUids.join(', ')})`);
      }
    } finally {
      lock.release();
    }
  } catch (error) {
    logger.error('Ошибка при работе с Gmail:', error.message);
    throw error;
  } finally {
    await client.logout();
    logger.debug('Отключено от Gmail IMAP');
  }

  return emails;
}
