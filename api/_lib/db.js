require('dotenv').config();
const { Pool }  = require('pg');
const bcrypt    = require('bcryptjs');
const usersData = require('../../server/data/users.json');

const useSSL =
  process.env.DATABASE_URL?.includes('supabase') ||
  process.env.NODE_ENV === 'production';

// Reuse pool across warm invocations
if (!global._pgPool) {
  global._pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSSL ? { rejectUnauthorized: false } : false,
    max: 3,
  });
}
const pool = global._pgPool;

let tablesReady = false;

async function ensureTables() {
  if (tablesReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      username   VARCHAR(255),
      email      VARCHAR(255),
      password   VARCHAR(255) NOT NULL,
      role       VARCHAR(20)  NOT NULL DEFAULT 'student',
      name       VARCHAR(255) NOT NULL,
      basket     INTEGER[]    NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS users_username_key
      ON users (username) WHERE username IS NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS users_email_key
      ON users (email) WHERE email IS NOT NULL;

    CREATE TABLE IF NOT EXISTS course_overrides (
      course_id  INTEGER PRIMARY KEY,
      data       JSONB        NOT NULL,
      updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id            BIGSERIAL PRIMARY KEY,
      course_id     VARCHAR(50)  NOT NULL,
      username      VARCHAR(255) NOT NULL,
      name          VARCHAR(255),
      course_rating NUMERIC(3,1),
      prof_rating   NUMERIC(3,1),
      comment       TEXT,
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
  `);

  // Seed default admin/student users if table is empty
  const { rows } = await pool.query('SELECT COUNT(*) FROM users');
  if (parseInt(rows[0].count) === 0) {
    for (const u of usersData) {
      const hashed = await bcrypt.hash(u.password, 10);
      await pool.query(
        `INSERT INTO users (username, password, role, name)
         VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        [u.username, hashed, u.role, u.name]
      );
    }
  }

  tablesReady = true;
}

module.exports = { pool, ensureTables };
