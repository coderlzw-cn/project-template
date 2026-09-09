module.exports = {
  apps: [
    {
      name: 'demo-api',
      script: './dist/main.js',
      cwd: __dirname,

      // 当前项目使用了 ScheduleModule 和内存缓存，先保持单实例，
      // 避免定时任务在多个进程中重复执行。
      instances: 1,
      exec_mode: 'fork',

      autorestart: true,
      // ApplicationControlService.stop() 以 0 退出时保持停止；
      // restart() 使用非 0 专用退出码，仍会由 PM2 自动拉起。
      stop_exit_codes: [0],
      watch: false,
      max_memory_restart: '512M',

      // 给 NestJS 留出关闭 HTTP、数据库等资源的时间。
      kill_timeout: 10000,

      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
