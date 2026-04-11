const bcrypt      = require('bcryptjs');
const { connectDB, pool } = require('./db');
const usersData   = require('./data/users.json');
const coursesData = require('./data/courses.json');

async function init() {
  await connectDB();

  // ── Seed users if table is empty ─────────────────────────────────────────
  const { rows: userCount } = await pool.query('SELECT COUNT(*) FROM users');
  if (parseInt(userCount[0].count) === 0) {
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

  // ── Seed courses if table is empty ────────────────────────────────────────
  const { rows: courseCount } = await pool.query('SELECT COUNT(*) FROM courses');
  if (parseInt(courseCount[0].count) === 0) {
    for (const c of coursesData) {
      await pool.query(
        `INSERT INTO courses (id, area, term, course, faculty, credits, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [c.id, c.area, c.term, c.course, c.faculty, c.credits ?? null, c.description || '']
      );
    }
    await pool.query(`SELECT setval('courses_id_seq', (SELECT MAX(id) FROM courses))`).catch(() => {});
    console.log(`✓ Auto-seeded ${coursesData.length} courses`);
  }

  // ── One-time migration: faculty text column → professors table ─────────────
  // Checks if faculty column still exists; runs only once then drops it.
  const { rows: hasFaculty } = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'faculty'
  `);

  if (hasFaculty.length > 0) {
    // 1. Populate professors from distinct faculty names
    await pool.query(`
      INSERT INTO professors (name)
      SELECT DISTINCT faculty FROM courses
      WHERE faculty IS NOT NULL AND faculty <> ''
      ON CONFLICT (name) DO NOTHING
    `);

    // 2. Set professor1_id on every course from existing faculty text
    await pool.query(`
      UPDATE courses c
         SET professor1_id = p.id
        FROM professors p
       WHERE p.name = c.faculty
         AND c.professor1_id IS NULL
    `);

    // 3. Drop the now-redundant faculty text column
    await pool.query(`ALTER TABLE courses DROP COLUMN faculty`);

    const { rows: profCount } = await pool.query('SELECT COUNT(*) FROM professors');
    console.log(`✓ Migrated ${profCount[0].count} professors to professors table`);
  }
}

module.exports = init;
