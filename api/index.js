require('dotenv').config();
const init = require('../server/init');
const app  = require('../server/app');

let initialized = false;

module.exports = async (req, res) => {
  if (!initialized) {
    await init();
    initialized = true;
  }
  return app(req, res);
};
