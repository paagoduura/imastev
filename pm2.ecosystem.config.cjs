// pm2 ecosystem config — run with: pm2 start pm2.ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'imstev-api',
      script: 'npx',
      args: 'tsx server/index.ts',
      instances: 'max',          // use all CPU cores
      exec_mode: 'cluster',
      watch: false,
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // Log config
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-err.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Restart policy
      max_memory_restart: '512M',
      restart_delay: 3000,
      max_restarts: 10,
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};
