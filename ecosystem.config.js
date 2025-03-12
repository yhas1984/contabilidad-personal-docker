module.exports = {
  apps: [
    {
      name: "tu-envio-express",
      script: "./.next/standalone/server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        // Add your environment variables here
        EMAIL_HOST: "smtp.hostinger.com",
        EMAIL_PORT: "465",
        EMAIL_SECURE: "true",
        EMAIL_USER: "contacto@tuenvioexpress.es",
        // Don't include sensitive data like passwords in this file
        // Use PM2 environment files or .env files instead
      },
      error_file: "logs/pm2-error.log",
      out_file: "logs/pm2-out.log",
      log_file: "logs/combined.log",
      time: true,
    },
  ],
}

