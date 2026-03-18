const bcrypt     = require('bcryptjs');
const { connectDB, pool } = require('./db');
const usersData  = require('./data/users.json');

async function init() {
  await connectDB();

  // Seed default users if table is empty
  const { rows } = await pool.query('SELECT COUNT(*) FROM users');
  if (parseInt(rows[0].count) > 0) return;

  for (const u of usersData) {
    const hashed = await bcrypt.hash(u.password, 10);
    await pool.query(
      `INSERT INTO users (username, password, role, name)
       VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [u.username, hashed, u.role, u.name]
    );
  }
  console.log(`✓ Auto-seeded ${usersData.length} users`);
}

module.exports = init;
