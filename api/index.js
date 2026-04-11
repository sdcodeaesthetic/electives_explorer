require('dotenv').config();
const app  = require('../server/app');
const init = require('../server/init');

// Run DB init on cold start — creates tables and seeds data if empty (idempotent)
init().catch(err => console.error('Init error:', err.message));

module.exports = app;
