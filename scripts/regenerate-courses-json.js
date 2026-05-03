require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const COURSE_SELECT = `
  SELECT
    c.id, c.area, c.term, c.course, c.credits, c.description,
    c.key_takeaways, c.prerequisites, c.course_curriculum,
    c.summary, c.complementary_courses,
    c.professor1_id, c.professor2_id,
    p1.name AS professor1_name,
    p2.name AS professor2_name,
    CASE
      WHEN p2.name IS NOT NULL THEN p1.name || ' & ' || p2.name
      ELSE p1.name
    END AS faculty,
    c.created_at, c.updated_at
  FROM courses c
  LEFT JOIN professors p1 ON p1.id = c.professor1_id
  LEFT JOIN professors p2 ON p2.id = c.professor2_id
  ORDER BY c.id ASC
`;

async function main() {
  const { rows } = await pool.query(COURSE_SELECT);
  const courses = rows.map(r => ({ ...r, credits: r.credits != null ? parseFloat(r.credits) : null }));
  const outPath = path.resolve(__dirname, '../server/data/courses.json');
  fs.writeFileSync(outPath, JSON.stringify(courses, null, 2));
  console.log('Written ' + courses.length + ' courses to server/data/courses.json');
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
