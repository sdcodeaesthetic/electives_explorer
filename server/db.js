const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function connectDB() {
  const client = await pool.connect();
  try {
    await client.query(`
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
    `);

    const db = (await client.query('SELECT current_database()')).rows[0].current_database;
    console.log('PostgreSQL connected:', db);
  } finally {
    client.release();
  }
}

module.exports = { pool, connectDB };
