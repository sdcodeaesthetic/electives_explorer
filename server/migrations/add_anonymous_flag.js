require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  await pool.query(`
    ALTER TABLE course_ratings
      ADD COLUMN IF NOT EXISTS anonymous BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE professor_ratings
      ADD COLUMN IF NOT EXISTS anonymous BOOLEAN NOT NULL DEFAULT false;
  `);
  console.log('✓ Added anonymous column to course_ratings and professor_ratings');
  await pool.end();
}

run().catch(err => { console.error(err); process.exit(1); });
