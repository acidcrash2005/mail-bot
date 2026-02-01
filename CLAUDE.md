# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mail-bot is a Node.js application that monitors a Gmail inbox, translates incoming emails to Russian using Lingva Translate, and forwards them to a Telegram channel.

## Commands

```bash
# Install dependencies
npm install

# Run the application
npm start

# Run with file watching (development)
npm run dev

# Enable debug logging
DEBUG=1 npm start
```

## Architecture

```
Gmail (IMAP) → Mail Bot → Lingva Translate → Telegram Channel
```

**Flow:**
1. Cron job runs every N minutes (configurable via `CHECK_INTERVAL_MINUTES`)
2. Connects to Gmail via IMAP, searches for unread emails from specified sender
3. Parses email content and attachments using `mailparser`
4. Translates text to Russian via Lingva Translate API (with fallback servers)
5. Sends formatted message + attachments to Telegram
6. Marks processed emails as read

## Key Files

- `src/index.js` - Entry point, cron scheduler, main processing loop with mutex protection
- `src/config.js` - Configuration from environment variables with validation
- `src/services/gmail.js` - IMAP connection via `imapflow`, email fetching and parsing
- `src/services/translator.js` - Lingva Translate integration with server fallback
- `src/services/telegram.js` - Telegram bot messaging with message splitting and attachment handling
- `src/utils/logger.js` - Console logger with colors, debug mode via `DEBUG` env var

## Environment Variables

Required in `.env`:
- `GMAIL_USER` - Gmail address
- `GMAIL_APP_PASSWORD` - Gmail app password (not regular password)
- `TELEGRAM_BOT_TOKEN` - Telegram bot token from @BotFather
- `TELEGRAM_CHAT_ID` - Target Telegram channel/chat ID

Optional:
- `FILTER_FROM_EMAIL` - Sender to filter (default: `702mariana@gmail.com`)
- `CHECK_INTERVAL_MINUTES` - Check interval in minutes (default: `2`)
- `DEBUG` - Enable debug logging when set to any value

## Technical Notes

- Uses ES modules (`"type": "module"` in package.json)
- `isProcessing` flag prevents concurrent email processing
- Messages over 4096 chars are split at newlines/spaces
- Attachments over 50MB are skipped with a warning
- Translation uses multiple Lingva servers with automatic fallback
- HTML emails are stripped to plain text before translation
