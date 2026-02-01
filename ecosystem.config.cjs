module.exports = {
  apps: [{
    name: 'mail-bot',
    script: 'src/index.js',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
