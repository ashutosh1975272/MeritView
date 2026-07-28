module.exports = {
  apps: [
    {
      name: 'meritview-backend',
      script: './backend/dist/index.js',
      cwd: './backend',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      restart_delay: 5000,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
      },
      env_development: {
        NODE_ENV: 'development',
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      time: true,
    },
  ],
};
