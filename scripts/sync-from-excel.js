/**
 * sync-from-excel.js
 *
 * Reads Electives_List.xlsx and synchronises the DB:
 *  - Updates credits, term, area, and faculty for matched courses
 *  - Creates new professor rows when a new faculty name appears
 *  - Prints a full diff report before applying changes
 *
 * Usage:
 *   node scripts/sync-from-excel.js             (dry-run, no DB writes)
 *   node scripts/sync-from-excel.js --apply      (writes to DB)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const path  = require('path');
const XLSX  = require('xlsx');
const { Pool } = require('pg');

const EXCEL_PATH = path.resolve(__dirname, '../../Electives_List.xlsx');
const DRY_RUN    = !process.argv.includes('--apply');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ── Area code → DB area name ──────────────────────────────────────────────────
const AREA_MAP = {
  'F&A':       'Finance',
  'GMPPE':     'GMPPE',
  'ISM':       'ISM',
  'MKTG':      'Marketing',
  'OB&HR':     'OB-HR',
  'OPS':       'Operations',
  'STM':       'Strategy',
  'STM+GMPPE': 'Inter Area Electives',
  'STM+F&A':   'Inter Area Electives',
  'STM+OB&HR': 'Inter Area Electives',
};

// ── Text normalisation helpers ────────────────────────────────────────────────

function collapse(s) {
  return String(s || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Normalise for comparison: lowercase, strip punct, & → and */
function normCmp(s) {
  return collapse(s)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[.,\-:;()\[\]/\\'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "TERM IV" → "Term IV" */
function normTerm(t) {
  return collapse(t).replace(/^TERM\s+/i, 'Term ');
}

/**
 * Normalise professor name for STORAGE:
 *   "Prof . Pratap Giri"  → "Prof. Pratap Giri"
 *   "Prof Nitin Balwani"  → "Prof. Nitin Balwani"
 */
function normProfStore(raw) {
  return collapse(raw)
    .replace(/\bProf\s*\.?\s+/g, 'Prof. ')
    .replace(/\bDr\s*\.?\s+/g,   'Dr. ')
    .replace(/\bMr\s*\.?\s+/g,   'Mr. ')
    .replace(/\bMs\s*\.?\s+/g,   'Ms. ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Strip titles, periods, extra space — for matching only */
function normProfCmp(s) {
  return collapse(s)
    .toLowerCase()
    .replace(/\b(prof|dr|mr|ms)\.?\s*/gi, '')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Course token similarity (minLen=4, prefix stemming) ───────────────────────

/** Expand common abbreviations so tokenisation can match them */
function expandAbbrev(s) {
  return s
    .replace(/\bb2b\b/gi,  'business business')
    .replace(/\bcrm\b/gi,  'customer relationship management')
    .replace(/\bsapm\b/gi, 'security analysis portfolio management');
}

/**
 * Jaccard-style token similarity with:
 *  - abbreviation expansion ("B2B" → "business business")
 *  - minLen=4 to exclude noise words ("and", "for", "the", "of")
 *  - prefix stemming: "acquisition" matches "acquisitions", "neuro" matches "neuromarketing"
 *  - modified union: |A| + |B| - |matched| (avoids penalising partial matches)
 */
function courseTokenSim(a, b) {
  const tA = normCmp(expandAbbrev(a)).split(/\s+/).filter(t => t.length >= 4);
  const tB = normCmp(expandAbbrev(b)).split(/\s+/).filter(t => t.length >= 4);
  if (!tA.length && !tB.length) return 1;
  if (!tA.length || !tB.length) return 0;

  const usedB = new Array(tB.length).fill(false);
  let matched = 0;

  for (const ta of tA) {
    for (let j = 0; j < tB.length; j++) {
      if (usedB[j]) continue;
      const tb = tB[j];
      const prefixMatch =
        (ta.length >= 5 && tb.startsWith(ta)) ||
        (tb.length >= 5 && ta.startsWith(tb));
      if (ta === tb || prefixMatch) {
        matched++;
        usedB[j] = true;
        break;
      }
    }
  }

  const union = tA.length + tB.length - matched;
  return union > 0 ? matched / union : 0;
}

// ── Levenshtein edit distance ─────────────────────────────────────────────────
function editDist(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

// ── Professor identity ────────────────────────────────────────────────────────
/**
 * True if two names likely refer to the same person.
 * Handles: order swap ("Pritee Kumari" ↔ "Kumari Pritee"),
 *          partial name ("Dharen Pandey" ↔ "Dharen Kumar Pandey"),
 *          merged/split surname ("Desarkar" ↔ "De Sarkar"),
 *          minor typo ("Arumugam" ↔ "Armugam").
 */
function samePerson(a, b) {
  const ca = normProfCmp(a);
  const cb = normProfCmp(b);
  if (ca === cb) return true;

  // Token containment: all tokens of shorter name are in longer name
  const ta = new Set(ca.split(/\s+/).filter(t => t.length > 1));
  const tb = new Set(cb.split(/\s+/).filter(t => t.length > 1));
  const inter = [...ta].filter(t => tb.has(t)).length;
  const minSz = Math.min(ta.size, tb.size);
  if (minSz >= 1 && inter >= minSz) return true;

  // Token Jaccard >= 65 %
  const union = new Set([...ta, ...tb]).size;
  if (union && inter / union >= 0.65) return true;

  // Character edit distance (handles merged words, minor typos)
  const maxLen = Math.max(ca.length, cb.length);
  if (maxLen > 0 && editDist(ca, cb) / maxLen < 0.25) return true;

  return false;
}

// ── Faculty parsing ───────────────────────────────────────────────────────────
/**
 * Parse raw faculty cell → array of cleaned professor names.
 * Splits on " & ", " and " (word boundary), or "/".
 * Returns null if value is TBD / FTBD / empty.
 */
function parseFaculty(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = collapse(raw);
  if (!s) return null;
  const up = s.toUpperCase();
  if (up.includes('FTBD') || up.includes('TBD') || up.includes('AWAITING')) return null;

  return s
    .split(/\s*(?:[&\/]|\band\b)\s*/i)
    .map(p => normProfStore(p))
    .filter(Boolean);
}

/** True if both faculty lists represent the same set of people (order-insensitive) */
function facultySetsEqual(dbNames, exNames) {
  if (dbNames.length !== exNames.length) return false;
  const used = new Array(exNames.length).fill(false);
  for (const dn of dbNames) {
    const i = exNames.findIndex((en, idx) => !used[idx] && samePerson(dn, en));
    if (i === -1) return false;
    used[i] = true;
  }
  return true;
}

// ── Professor DB upsert ───────────────────────────────────────────────────────
async function findOrCreateProf(cache, rawName) {
  const stored = normProfStore(rawName);

  // Exact normalised match
  for (const p of cache) {
    if (normProfCmp(p.name) === normProfCmp(stored)) return p.id;
  }

  // samePerson() fallback
  for (const p of cache) {
    if (samePerson(p.name, stored)) return p.id;
  }

  // Create new professor
  const { rows } = await pool.query(
    'INSERT INTO professors (name) VALUES ($1) RETURNING id, name',
    [stored]
  );
  console.log(`    + New professor created: "${stored}"`);
  cache.push({ id: rows[0].id, name: rows[0].name });
  return rows[0].id;
}

// ── Course matching ───────────────────────────────────────────────────────────
/**
 * Matching priority:
 *  1. Same area, courseTokenSim >= 0.28
 *  2. Cross-area, courseTokenSim >= 0.55 AND same term   (genuine area corrections)
 */
function findBestMatch(ec, dbCourses, usedDbIds) {
  let best = null, bestSim = 0;

  for (const dc of dbCourses) {
    if (usedDbIds.has(dc.id)) continue;
    if (dc.area !== ec.area) continue;
    const s = courseTokenSim(ec.courseName, dc.course);
    if (s > bestSim) { bestSim = s; best = dc; }
  }
  if (best && bestSim >= 0.28) return { dc: best, sim: bestSim };

  // Cross-area (strict threshold + same term required)
  let xBest = null, xSim = 0;
  for (const dc of dbCourses) {
    if (usedDbIds.has(dc.id)) continue;
    if (dc.area === ec.area) continue;
    if (dc.term !== ec.term) continue;
    const s = courseTokenSim(ec.courseName, dc.course);
    if (s > xSim) { xSim = s; xBest = dc; }
  }
  if (xBest && xSim >= 0.55) return { dc: xBest, sim: xSim };

  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN
    ? '\n[DRY RUN] No changes will be written. Pass --apply to commit.\n'
    : '\n[APPLY MODE] Changes will be written to DB.\n');

  // 1. Read Excel
  const wb      = XLSX.readFile(EXCEL_PATH);
  const ws      = wb.Sheets['Sheet1'];
  const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 }).slice(1);

  const excelRows = rawRows
    .map(r => ({
      courseName: collapse(String(r[2] || '')),
      faculty:    r[4] ? collapse(String(r[4])) : null,
      credits:    r[5] != null && r[5] !== '' ? parseFloat(r[5]) : null,
      term:       r[6] ? normTerm(String(r[6])) : null,
      areaRaw:    r[8] ? String(r[8]).trim() : null,
      area:       r[8] ? (AREA_MAP[String(r[8]).trim()] || String(r[8]).trim()) : null,
    }))
    .filter(r => r.courseName);

  // 2. Fetch DB courses
  const { rows: dbCourses } = await pool.query(`
    SELECT c.id, c.course, c.area, c.term, c.credits,
           c.professor1_id, c.professor2_id,
           p1.name AS prof1, p2.name AS prof2
    FROM courses c
    LEFT JOIN professors p1 ON p1.id = c.professor1_id
    LEFT JOIN professors p2 ON p2.id = c.professor2_id
    ORDER BY c.id
  `);

  // 3. Professor cache
  const { rows: profCache } = await pool.query('SELECT id, name FROM professors ORDER BY id');

  // 4. Match Excel → DB
  const matched    = [];
  const newCourses = [];
  const usedDbIds  = new Set();

  for (const ec of excelRows) {
    const result = findBestMatch(ec, dbCourses, usedDbIds);
    if (!result) { newCourses.push(ec); continue; }
    const { dc, sim } = result;
    usedDbIds.add(dc.id);

    // 5. Diff
    const changes = [];

    if (ec.credits != null && parseFloat(dc.credits) !== ec.credits) {
      changes.push({ field: 'credits', from: dc.credits, to: ec.credits });
    }
    if (ec.term && dc.term !== ec.term) {
      changes.push({ field: 'term', from: dc.term, to: ec.term });
    }
    if (ec.area && dc.area !== ec.area) {
      changes.push({ field: 'area', from: dc.area, to: ec.area });
    }

    // Faculty diff
    const exFacNames = parseFaculty(ec.faculty);
    if (exFacNames && exFacNames.length > 0) {
      const dbFacNames = [dc.prof1, dc.prof2].filter(Boolean);
      if (!facultySetsEqual(dbFacNames, exFacNames)) {
        changes.push({
          field:    'faculty',
          from:     dbFacNames.join(' & ') || '(none)',
          to:       exFacNames.join(' & '),
          exNames:  exFacNames,
        });
      }
    }

    matched.push({ ec, dc, sim, changes });
  }

  // ── Print report ──────────────────────────────────────────────────────────────
  const withChanges = matched.filter(m => m.changes.length > 0);

  console.log(`Excel rows  : ${excelRows.length}`);
  console.log(`Matched     : ${matched.length}`);
  console.log(`With changes: ${withChanges.length}`);
  console.log(`Unmatched   : ${newCourses.length}\n`);

  if (withChanges.length === 0) {
    console.log('✓ No field differences detected.\n');
  } else {
    console.log('='.repeat(70));
    console.log('CHANGES TO APPLY');
    console.log('='.repeat(70));

    for (const { ec, dc, sim, changes } of withChanges) {
      console.log(`\n[DB id=${dc.id}, match=${(sim * 100).toFixed(0)}%]  "${dc.course}"`);
      if (normCmp(ec.courseName) !== normCmp(dc.course)) {
        console.log(`  Excel name: "${ec.courseName}"`);
      }
      for (const c of changes) {
        console.log(`  ${c.field.padEnd(8)}: "${c.from}"  →  "${c.to}"`);
      }

      if (!DRY_RUN) {
        const setMap = {};

        for (const c of changes) {
          if (c.field === 'credits') setMap.credits = c.to;
          if (c.field === 'term')    setMap.term    = c.to;
          if (c.field === 'area')    setMap.area    = c.to;
          if (c.field === 'faculty') {
            const [n1, n2 = null] = c.exNames;
            setMap.professor1_id = await findOrCreateProf(profCache, n1);
            setMap.professor2_id = n2 ? await findOrCreateProf(profCache, n2) : null;
          }
        }

        const cols   = Object.keys(setMap);
        const vals   = Object.values(setMap);
        const setCls = cols.map((col, i) => `${col} = $${i + 1}`).join(', ');
        vals.push(dc.id);

        await pool.query(
          `UPDATE courses SET ${setCls}, updated_at = NOW() WHERE id = $${vals.length}`,
          vals
        );
        console.log('  ✓ Applied');
      }
    }
  }

  // ── New Excel courses → INSERT ────────────────────────────────────────────────
  const unmatchedDb = dbCourses.filter(dc => !usedDbIds.has(dc.id));

  if (newCourses.length) {
    console.log('\n' + '='.repeat(70));
    console.log(DRY_RUN
      ? 'NEW COURSES (would be inserted)'
      : 'NEW COURSES (inserting)');
    console.log('='.repeat(70));

    for (const c of newCourses) {
      const facNames = parseFaculty(c.faculty);
      const facDisplay = facNames ? facNames.join(' & ') : '(TBD)';
      console.log(`\n  + "${c.courseName}"  [${c.area}, ${c.term}, ${c.credits}cr]`);
      console.log(`    Faculty: ${facDisplay}`);

      if (!DRY_RUN) {
        let p1id = null, p2id = null;
        if (facNames && facNames[0]) p1id = await findOrCreateProf(profCache, facNames[0]);
        if (facNames && facNames[1]) p2id = await findOrCreateProf(profCache, facNames[1]);

        const { rows } = await pool.query(
          `INSERT INTO courses
             (area, term, course, credits, professor1_id, professor2_id,
              description, key_takeaways, prerequisites, course_curriculum)
           VALUES ($1,$2,$3,$4,$5,$6,'','','','')
           RETURNING id`,
          [c.area, c.term, c.courseName, c.credits, p1id, p2id]
        );
        console.log(`    ✓ Inserted as id=${rows[0].id}`);
      }
    }
  }

  // ── DB courses not in Excel → DELETE ─────────────────────────────────────────
  if (unmatchedDb.length) {
    console.log('\n' + '='.repeat(70));
    console.log(DRY_RUN
      ? 'DB COURSES NOT IN EXCEL (would be deleted)'
      : 'DB COURSES NOT IN EXCEL (deleting)');
    console.log('='.repeat(70));

    for (const dc of unmatchedDb) {
      console.log(`\n  - [id=${dc.id}] "${dc.course}"  (${dc.area}, ${dc.term}, ${dc.credits}cr)`);

      if (!DRY_RUN) {
        // Ratings cascade-delete automatically (ON DELETE CASCADE).
        // Clean up any basket / planner arrays that reference this id.
        await pool.query(
          `UPDATE user_baskets SET basket = array_remove(basket, $1) WHERE $1 = ANY(basket)`,
          [dc.id]
        );
        await pool.query(
          `UPDATE planners SET basket = array_remove(basket, $1) WHERE $1 = ANY(basket)`,
          [dc.id]
        );
        await pool.query('DELETE FROM courses WHERE id = $1', [dc.id]);
        console.log('    ✓ Deleted');
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(70));
  if (DRY_RUN) {
    console.log('DRY RUN complete.');
    console.log(`  ${withChanges.length} course(s) would be updated.`);
    console.log(`  ${newCourses.length} course(s) would be inserted.`);
    console.log(`  ${unmatchedDb.length} course(s) would be deleted.`);
    console.log('\nRun with --apply to write changes to DB.\n');
  } else {
    console.log('Done.');
    console.log(`  ${withChanges.length} course(s) updated.`);
    console.log(`  ${newCourses.length} course(s) inserted.`);
    console.log(`  ${unmatchedDb.length} course(s) deleted.\n`);
  }

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
