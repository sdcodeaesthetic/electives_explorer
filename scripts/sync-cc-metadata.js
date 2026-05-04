/**
 * Syncs every complementary_courses entry's area/term/credits/faculty
 * against the live DB — fixing term format, wrong faculty, wrong credits, etc.
 * Preserves the `why` field and the course name unchanged.
 *
 * Run: node scripts/sync-cc-metadata.js [--apply]
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const DRY_RUN = !process.argv.includes('--apply');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== APPLYING ===\n');

  // Build authoritative lookup: course name → { area, term, credits, faculty }
  const { rows: allCourses } = await pool.query(`
    SELECT c.course, c.area, c.term, c.credits,
      CASE WHEN p2.name IS NOT NULL THEN p1.name || ' & ' || p2.name ELSE p1.name END AS faculty
    FROM courses c
    LEFT JOIN professors p1 ON p1.id = c.professor1_id
    LEFT JOIN professors p2 ON p2.id = c.professor2_id
  `);
  const lookup = {};
  for (const c of allCourses) {
    lookup[c.course] = {
      area:    c.area,
      term:    c.term,
      credits: c.credits != null ? String(parseFloat(c.credits)) : null,
      faculty: c.faculty,
    };
  }

  // Fetch all courses with CC
  const { rows: withCC } = await pool.query(
    'SELECT id, course, complementary_courses FROM courses WHERE complementary_courses IS NOT NULL AND jsonb_array_length(complementary_courses) > 0 ORDER BY id'
  );

  let updatedCourses = 0;
  let updatedEntries = 0;

  for (const row of withCC) {
    const original = row.complementary_courses;
    const fixed = original.map(cc => {
      const actual = lookup[cc.course];
      if (!actual) return cc; // name mismatch — skip (shouldn't happen after prior fix)

      const changes = {};
      if (cc.area    !== actual.area)    changes.area    = actual.area;
      if (cc.term    !== actual.term)    changes.term    = actual.term;
      if (cc.credits !== actual.credits) changes.credits = actual.credits;
      if (cc.faculty !== actual.faculty) changes.faculty = actual.faculty;

      if (!Object.keys(changes).length) return cc;

      updatedEntries++;
      if (DRY_RUN) {
        console.log('  [' + row.id + '] ' + row.course + ' → CC: "' + cc.course + '"');
        Object.entries(changes).forEach(([f, v]) =>
          console.log('      ' + f + ': "' + cc[f] + '" → "' + v + '"')
        );
      }
      return { ...cc, ...changes };
    });

    const changed = JSON.stringify(original) !== JSON.stringify(fixed);
    if (!changed) continue;

    updatedCourses++;
    if (!DRY_RUN) {
      await pool.query(
        'UPDATE courses SET complementary_courses=$1::jsonb, updated_at=NOW() WHERE id=$2',
        [JSON.stringify(fixed), row.id]
      );
      console.log('[' + row.id + '] ' + row.course + ' — updated');
    }
  }

  await pool.end();
  console.log(
    '\n' + (DRY_RUN ? 'Dry run' : 'Done') +
    ' — ' + updatedEntries + ' CC entries fixed across ' + updatedCourses + ' courses.' +
    (DRY_RUN ? ' Pass --apply to write.' : '')
  );
}
main().catch(e => { console.error(e.message); process.exit(1); });
