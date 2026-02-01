# Mail Bot

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Automatic email forwarding from Gmail to Telegram with Russian translation

---

## Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Configuration](#%EF%B8%8F-configuration)
- [Commands](#-commands)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Project Structure](#-project-structure)
- [License](#-license)

---

## Features

- **Gmail Monitoring** — scheduled checks for new emails via IMAP
- **Filtering** — track emails only from a specified sender
- **Translation** — automatic translation to Russian via Lingva Translate
- **Attachments** — forward PDFs and other files up to 50MB
- **Telegram** — instant delivery to a channel or chat

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Gmail     │────▶│   Mail Bot   │────▶│ Lingva Translate│────▶│   Telegram   │
│   (IMAP)    │     │   (Node.js)  │     │     (API)       │     │   Channel    │
└─────────────┘     └──────────────┘     └─────────────────┘     └──────────────┘
```

**Data Flow:**
1. Cron job checks email every N minutes
2. Fetches unread emails from the specified sender
3. Parses content and attachments
4. Translates text to Russian
5. Sends to Telegram channel
6. Marks emails as read

---

## Quick Start

### Prerequisites

- Node.js 18+
- Gmail account with two-factor authentication enabled
- Telegram bot (create via [@BotFather](https://t.me/BotFather))

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/mail-bot.git
cd mail-bot

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit the .env file

# Start
npm start
```

---

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

| Variable | Description | Required | Default |
|----------|-------------|:--------:|---------|
| `GMAIL_USER` | Gmail email address | Yes | — |
| `GMAIL_APP_PASSWORD` | Gmail app password | Yes | — |
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather | Yes | — |
| `TELEGRAM_CHAT_ID` | Channel/chat ID | Yes | — |
| `FILTER_FROM_EMAIL` | Filter by sender | No | `sender@example.com` |
| `CHECK_INTERVAL_MINUTES` | Check interval (min) | No | `2` |
| `DEBUG` | Enable debug logs | No | — |

### Getting Gmail App Password

1. Go to [Google Security Settings](https://myaccount.google.com/security)
2. Enable **2-Step Verification**
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Create a password for "Mail" application
5. Copy the 16-character password to `GMAIL_APP_PASSWORD`

### Getting Telegram Chat ID

```bash
# Run the test script after setting up your bot
npm run test:telegram
```

Or add the bot to a channel and send a message — the ID will appear in the logs.

---

## Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start the bot |
| `npm run dev` | Start with auto-reload (development) |
| `npm run debug:email` | Email parsing diagnostics |
| `npm run test:telegram` | Test Telegram sending |

---

## Deployment

### PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start
pm2 start ecosystem.config.cjs

# Auto-start on system boot
pm2 startup
pm2 save

# Monitoring
pm2 logs mail-bot
pm2 monit
```

### Docker

```bash
docker build -t mail-bot .
docker run -d --env-file .env --name mail-bot mail-bot
```

### Systemd (Linux)

```bash
sudo cp mail-bot.service /etc/systemd/system/
sudo systemctl enable mail-bot
sudo systemctl start mail-bot
```

---

## Troubleshooting

### "Invalid credentials" error

- Make sure you're using an **app password**, not your regular password
- Verify that two-factor authentication is enabled

### Emails not being parsed (0 of N)

```bash
# Run diagnostics
npm run debug:email
```

### Translation not working

Lingva Translate servers may be unavailable. The bot automatically falls back to the original text.

### Attachments not sending

Telegram limits file size to 50MB. Larger files are skipped with a warning.

---

## Project Structure

```
mail-bot/
├── src/
│   ├── index.js          # Entry point, cron scheduler
│   ├── config.js         # Configuration from .env
│   ├── services/
│   │   ├── gmail.js      # IMAP connection and parsing
│   │   ├── telegram.js   # Telegram sending
│   │   └── translator.js # Translation via Lingva
│   └── utils/
│       └── logger.js     # Logging
├── scripts/
│   ├── debug-email.js    # Parsing diagnostics
│   └── test-telegram.js  # Telegram test
├── .env.example          # Configuration template
├── ecosystem.config.cjs  # PM2 config
└── package.json
```

---

## License

MIT
