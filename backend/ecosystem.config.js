module.exports = {
  apps: [{
    name: 'trustless-backend',
    script: './dist/server.js',
    instances: 'max', // Use all CPU cores (cluster mode)
    exec_mode: 'cluster',
    
    // Environment variables
    env_production: {
      NODE_ENV: 'production',
      PORT: 4000,
    },
    
    // Auto-restart configuration
    max_memory_restart: '500M', // Restart if memory exceeds 500MB
    min_uptime: '10s', // Min uptime before considered stable
    max_restarts: 10, // Max restarts within 1 minute before stopping
    
    // Logging
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Graceful shutdown
    kill_timeout: 5000, // Wait 5s before force kill
    wait_ready: true, // Wait for ready signal
    listen_timeout: 10000,
    
    // Monitoring
    watch: false, // Don't watch files in production
    ignore_watch: ['node_modules', 'logs'],
    
    // Cron restart (optional - restart daily at 3 AM)
    cron_restart: '0 3 * * *',
  }]
};
