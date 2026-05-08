module.exports = {
  apps: [{
    name: 'hayati',
    script: 'server.js',
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
      JWT_SECRET: 'hayati-dev-secret-change-me',
      DATABASE_URL: 'postgresql://localhost:5432/hayati'
    }
  }]
};
