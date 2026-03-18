require('dotenv').config();
const app  = require('./app');
const init = require('./init');

const PORT = process.env.PORT || 6000;

init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Startup error:', err.message);
    process.exit(1);
  });
