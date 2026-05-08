const { initDB } = require('../database');
const app = require('../server');

console.log('Hayati serverless function starting...');
console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);
console.log('JWT_SECRET set:', !!process.env.JWT_SECRET);
console.log('NODE_ENV:', process.env.NODE_ENV);

initDB().then(() => {
  console.log('Database tables initialized successfully');
}).catch(err => {
  console.error('DB init error:', err.message, err.stack);
});

module.exports = app;
