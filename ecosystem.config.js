module.exports = {
  apps: [{
    name: 'misopin-cms',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/misopin-cms',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
    },
    max_memory_restart: '500M',
    error_file: '/var/log/pm2/misopin-cms-error.log',
    out_file: '/var/log/pm2/misopin-cms-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s',
  }],
};
