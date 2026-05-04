require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  // Build a lookup: course name → actual DB row
  const { rows: allCourses } = await pool.query(`
    SELECT c.id, c.course, c.area, c.term, c.credits,
      CASE WHEN p2.name IS NOT NULL THEN p1.name || ' & ' || p2.name ELSE p1.name END AS faculty
    FROM courses c
    LEFT JOIN professors p1 ON p1.id = c.professor1_id
    LEFT JOIN professors p2 ON p2.id = c.professor2_id
    ORDER BY c.id
  `);
  const byName = {};
  for (const c of allCourses) byName[c.course] = c;

  const { rows: withCC } = await pool.query(
    'SELECT id, course, complementary_courses FROM courses WHERE complementary_courses IS NOT NULL AND jsonb_array_length(complementary_courses) > 0 ORDER BY id'
  );

  const nameMismatches   = [];
  const metaMismatches   = [];

  for (const row of withCC) {
    for (const cc of row.complementary_courses) {
      const actual = byName[cc.course];

      // 1. Name doesn't exist
      if (!actual) {
        nameMismatches.push({ parentId: row.id, parent: row.course, ccName: cc.course });
        continue;
      }

      // 2. Metadata drift
      const diffs = [];
      if (cc.area !== actual.area)
        diffs.push({ field: 'area',    cc: cc.area,    actual: actual.area });
      if (cc.term !== actual.term)
        diffs.push({ field: 'term',    cc: cc.term,    actual: actual.term });
      if (String(cc.credits) !== String(actual.credits != null ? parseFloat(actual.credits) : ''))
        diffs.push({ field: 'credits', cc: cc.credits, actual: actual.credits });
      if (cc.faculty !== actual.faculty)
        diffs.push({ field: 'faculty', cc: cc.faculty, actual: actual.faculty });

      if (diffs.length) {
        metaMismatches.push({ parentId: row.id, parent: row.course, ccName: cc.course, diffs });
      }
    }
  }

  if (!nameMismatches.length && !metaMismatches.length) {
    console.log('No mismatches — all complementary course names and metadata match actual courses.');
    await pool.end();
    return;
  }

  if (nameMismatches.length) {
    console.log('── NAME MISMATCHES (' + nameMismatches.length + ') ──');
    nameMismatches.forEach(m => console.log('[' + m.parentId + '] ' + m.parent + '\n    "' + m.ccName + '" — not found in courses table\n'));
  }

  if (metaMismatches.length) {
    console.log('── METADATA MISMATCHES (' + metaMismatches.length + ') ──');
    metaMismatches.forEach(m => {
      console.log('[' + m.parentId + '] ' + m.parent + ' → CC: "' + m.ccName + '"');
      m.diffs.forEach(d => console.log('    ' + d.field + ': CC has "' + d.cc + '" | DB has "' + d.actual + '"'));
      console.log('');
    });
  }

  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
