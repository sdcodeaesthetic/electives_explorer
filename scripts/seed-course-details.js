/**
 * seed-course-details.js
 *
 * One-time seed: reads course metadata from Course evaluator.xlsx and rich
 * structured content from Course_Evaluator.docx, then updates every matching
 * row in the existing `courses` table via the DATABASE_URL pg connection.
 *
 * Columns updated per course:
 *   prerequisites         TEXT  — replaced with bullet-point text from docx
 *   key_takeaways         TEXT  — replaced with bullet-point text from docx
 *   summary               TEXT[] — 3-5 relevance bullet strings
 *   complementary_courses JSONB  — [{ course, term, credits, area, faculty, why }]
 *
 * Usage:
 *   npm run seed:details
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const path    = require('path');
const XLSX    = require('xlsx');
const mammoth = require('mammoth');
const { Pool } = require('pg');

// ── Paths ─────────────────────────────────────────────────────────────────────
const EXCEL_PATH = path.resolve(__dirname, '../../Course evaluator.xlsx');
const DOCX_PATH  = path.resolve(__dirname, '../../Course_Evaluator.docx');

// ── DB pool ───────────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ── Excel reader ──────────────────────────────────────────────────────────────
function readExcel(filePath) {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

// ── Docx parser ───────────────────────────────────────────────────────────────
async function parseDocx(filePath) {
  const { value: text } = await mammoth.extractRawText({ path: filePath });
  const parts   = text.split('\n\nCategory: ');
  const courses = [];

  for (let i = 1; i < parts.length; i++) {
    const prevParas  = parts[i - 1].split('\n\n').filter(s => s.trim());
    const courseName = prevParas[prevParas.length - 1].trim();
    const block      = parts[i];

    const toArr = m => (m ? m[1].split('\n\n').map(s => s.trim()).filter(Boolean) : []);

    const summary       = toArr(block.match(/Summary & Relevance\n\n([\s\S]+?)\n\nPrerequisites/));
    const prerequisites = toArr(block.match(/Prerequisites\n\n([\s\S]+?)\n\nFive Key Takeaways/));
    const key_takeaways = toArr(block.match(/Five Key Takeaways\n\n([\s\S]+?)\n\nBest Complementary Subjects/));

    const complementary_courses = [];
    const complM = block.match(
      /Best Complementary Subjects\n\nCourse\n\nTerm\n\nCredits\n\nArea\n\nFaculty\n\nWhy It Complements\n\n([\s\S]+?)(?:\n\n\n\n|$)/
    );
    if (complM) {
      const cells = complM[1].split('\n\n').map(s => s.trim()).filter(Boolean);
      for (let j = 0; j + 5 < cells.length; j += 6) {
        complementary_courses.push({
          course:  cells[j],
          term:    cells[j + 1],
          credits: cells[j + 2],
          area:    cells[j + 3],
          faculty: cells[j + 4],
          why:     cells[j + 5],
        });
      }
    }

    courses.push({
      course_name:          courseName,
      summary,
      prerequisites_text:   prerequisites.map(b => `• ${b}`).join('\n'),
      key_takeaways_text:   key_takeaways.map(b => `• ${b}`).join('\n'),
      complementary_courses,
    });
  }

  return courses;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  console.log('📖  Reading Excel…');
  const excelRows = readExcel(EXCEL_PATH);
  console.log(`    ${excelRows.length} courses in Excel.\n`);

  console.log('📖  Parsing Course_Evaluator.docx…');
  const docxCourses = await parseDocx(DOCX_PATH);
  console.log(`    ${docxCourses.length} courses parsed.\n`);

  const docxByName = new Map(docxCourses.map(c => [c.course_name, c]));

  // Excel name → exact docx name (where they differ)
  const NAME_MAP = {
    'Options, Futures and Derivatives':                           'Options, Futures and Derivatives (OFD)',
    'Sales in the Age of AI (SAI)':                              'Sales in the Age of AI',
    'Decision Making Tools for Managers':                        'Decision Making Tools for Managers (DMTM)',
    'Finance Modelling using Excel':                             'Finance Modelling using Excel (FME)',
    'Applied Econometrics for Manager':                          'Applied Econometrics for Managers',
    'Theory of Constraints (Constraint Management)':             'Theory of Constraints',
    'Mergers & Acquisitions':                                    'Mergers & Acquisitions (Strategy)',
    'Mergers & Acquisition':                                     'Mergers & Acquisition (Finance)',
    'Marketing Semiotics (Semiotic Strategies)':                 'Marketing Semiotics / Semiotic Strategies',
    'Coaching and Mentoring for Well-being: Learn to Flourish':  'Coaching and Mentoring for Well-being (CMW)',
  };

  const client = await pool.connect();
  let ok = 0, failed = 0;

  try {
    await client.query('BEGIN');

    for (const row of excelRows) {
      const courseName = String(row['Subject Name']).trim();
      const docxKey = NAME_MAP[courseName] || courseName;
      const rich = docxByName.get(docxKey);

      if (!rich) {
        console.warn(`  ⚠  No docx entry for: "${courseName}"`);
        failed++;
        continue;
      }

      const { rowCount } = await client.query(
        `UPDATE courses
            SET prerequisites        = $1,
                key_takeaways        = $2,
                summary              = $3,
                complementary_courses = $4,
                updated_at           = NOW()
          WHERE course = $5`,
        [
          rich.prerequisites_text,
          rich.key_takeaways_text,
          rich.summary,
          JSON.stringify(rich.complementary_courses),
          courseName,
        ]
      );

      if (rowCount === 0) {
        console.warn(`  ⚠  No DB row matched: "${courseName}"`);
        failed++;
      } else {
        console.log(`  ✓  ${courseName}`);
        ok++;
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Fatal — rolled back:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }

  console.log(`\nDone. ✓ ${ok} updated, ✗ ${failed} failed.`);
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
