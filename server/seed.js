/**
 * seed.js — Seed default users into PostgreSQL
 * Run once: node server/seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB, pool } = require('./db');
const usersData = require('./data/users.json');

async function seed() {
  await connectDB();
  console.log('Connected to PostgreSQL');

  // ── Users ──────────────────────────────────────────────────────────────────
  const { rows } = await pool.query('SELECT COUNT(*) FROM users');
  const existingUsers = parseInt(rows[0].count);

  if (existingUsers === 0) {
    for (const u of usersData) {
      const hashed = await bcrypt.hash(u.password, 10);
      await pool.query(
        `INSERT INTO users (username, password, role, name)
         VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        [u.username, hashed, u.role, u.name]
      );
    }
    console.log(`✓ Seeded ${usersData.length} users`);
  } else {
    console.log(`  Users already seeded (${existingUsers} found), skipping`);
  }

  await pool.end();
  console.log('Done — PostgreSQL disconnected');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
