const { initDB } = require('../database');
const app = require('../server');

initDB().catch(err => console.error('DB init error:', err.message));

module.exports = app;
