// pm2 (VPS / shared Node hosting):
//   npm ci && npm run build && npm run db:migrate
//   pm2 start ecosystem.config.cjs && pm2 save
module.exports = {
  apps: [
    {
      name: "google-nfc-connect",
      script: "server.mjs",
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production", PORT: 3000 },
      max_memory_restart: "512M",
    },
  ],
};
