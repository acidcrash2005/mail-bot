const colors = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function getTimestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function formatMessage(level, color, ...args) {
  const timestamp = `${colors.gray}[${getTimestamp()}]${colors.reset}`;
  const levelTag = `${color}[${level}]${colors.reset}`;
  return [timestamp, levelTag, ...args];
}

export const logger = {
  info(...args) {
    console.log(...formatMessage('INFO', colors.green, ...args));
  },

  warn(...args) {
    console.warn(...formatMessage('WARN', colors.yellow, ...args));
  },

  error(...args) {
    console.error(...formatMessage('ERROR', colors.red, ...args));
  },

  debug(...args) {
    if (process.env.DEBUG) {
      console.log(...formatMessage('DEBUG', colors.blue, ...args));
    }
  },
};
