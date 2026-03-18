require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const bcrypt  = require('bcryptjs');
const { connectDB, pool } = require('./db');
const coursesRouter     = require('./routes/courses');
const authRouter        = require('./routes/auth');
const reviewsRouter     = require('./routes/reviews');
const suggestionsRouter = require('./routes/suggestions');
const sessionRouter     = require('./routes/session');

// Auto-seed users on first startup
async function autoSeed() {
  try {
    const usersData = require('./data/users.json');

    const { rows } = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(rows[0].count) > 0) return;

    const users = await Promise.all(
      usersData.map(async u => ({
        username: u.username,
        password: await bcrypt.hash(u.password, 10),
        role:     u.role,
        name:     u.name,
      }))
    );

    for (const u of users) {
      await pool.query(
        `INSERT INTO users (username, password, role, name)
         VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        [u.username, u.password, u.role, u.name]
      );
    }
    console.log(`✓ Auto-seeded ${users.length} users`);
  } catch (err) {
    console.error('Auto-seed error:', err.message);
  }
}

const app  = express();
const PORT = process.env.PORT || 6000;

const allowedOrigin = process.env.CORS_ORIGIN;
app.use(cors({
  origin: allowedOrigin || '*',
  credentials: true,
}));
app.use(express.json());

app.use('/api/courses',     coursesRouter);
app.use('/api/auth',        authRouter);
app.use('/api/reviews',     reviewsRouter);
app.use('/api/suggestions', suggestionsRouter);
app.use('/api/session',     sessionRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Connect to PostgreSQL then start server
connectDB()
  .then(() => {
    autoSeed();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('PostgreSQL connection error:', err.message);
    process.exit(1);
  });
