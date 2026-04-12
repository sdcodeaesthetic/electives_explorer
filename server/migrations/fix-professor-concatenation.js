/**
 * Migration: fix-professor-concatenation
 *
 * Finds every professors row whose name contains " & " (combined),
 * splits it into two individual names, finds-or-creates each individual
 * professor record, updates every course that points to the combined
 * row to use professor1_id / professor2_id correctly, then deletes the
 * now-unused combined row.
 *
 * Safe to run multiple times (idempotent): combined rows that have
 * already been removed are simply skipped.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../db');

async function findOrCreate(client, name) {
  const trimmed = name.trim();
  const existing = await client.query(
    'SELECT id FROM professors WHERE name = $1', [trimmed]);
  if (existing.rows.length) return existing.rows[0].id;
  const inserted = await client.query(
    'INSERT INTO professors (name) VALUES ($1) RETURNING id', [trimmed]);
  console.log(`  + Created professor: "${trimmed}" → id ${inserted.rows[0].id}`);
  return inserted.rows[0].id;
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find all combined professor rows
    const { rows: combined } = await client.query(
      `SELECT id, name FROM professors WHERE name LIKE '%&%' ORDER BY id`);

    if (!combined.length) {
      console.log('No combined professor rows found — nothing to do.');
      await client.query('ROLLBACK');
      return;
    }

    console.log(`Found ${combined.length} combined professor row(s):\n`);

    for (const prof of combined) {
      const ampIdx = prof.name.indexOf(' & ');
      if (ampIdx === -1) continue;              // guard: no " & " with spaces

      const part1 = prof.name.slice(0, ampIdx).trim();
      const part2 = prof.name.slice(ampIdx + 3).trim();

      console.log(`[id ${prof.id}] "${prof.name}"`);
      console.log(`  → part1: "${part1}"`);
      console.log(`  → part2: "${part2}"`);

      const id1 = await findOrCreate(client, part1);
      const id2 = await findOrCreate(client, part2);

      // Find all courses that still point to the combined row
      const { rows: courses } = await client.query(
        `SELECT id, course FROM courses WHERE professor1_id = $1 OR professor2_id = $1`,
        [prof.id]);

      if (courses.length === 0) {
        console.log(`  No courses reference id ${prof.id} — deleting directly.`);
      } else {
        for (const course of courses) {
          await client.query(
            `UPDATE courses
                SET professor1_id = $1,
                    professor2_id = $2
              WHERE id = $3`,
            [id1, id2, course.id]);
          console.log(`  Updated course id ${course.id}: "${course.course}"`);
          console.log(`    professor1_id → ${id1} ("${part1}")`);
          console.log(`    professor2_id → ${id2} ("${part2}")`);
        }
      }

      // Update any professor_ratings that reference the combined name
      const { rowCount: ratingRows } = await client.query(
        `UPDATE professor_ratings SET professor_name = $1 WHERE professor_name = $2`,
        [part1, prof.name]);
      if (ratingRows > 0)
        console.log(`  Migrated ${ratingRows} professor_rating row(s) to "${part1}"`);

      // Delete the combined row (safe: courses no longer reference it)
      await client.query('DELETE FROM professors WHERE id = $1', [prof.id]);
      console.log(`  Deleted combined professor row id ${prof.id}\n`);
    }

    await client.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed — rolled back:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
