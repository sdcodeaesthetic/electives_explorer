/**
 * Fixes all complementary_courses entries to use exact course names from the DB:
 *  - Resolves 24 name mismatches (truncated names, wrong spellings, old names)
 *  - Replaces 2 non-existent courses with real available courses (context-sensitive)
 *  - Adds 3 complementary courses for Financial Technology (id=106)
 *  - Updates area/term/credits/faculty metadata to match actual DB values
 *
 * Run: node scripts/fix-complementary-courses.js [--apply]
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const DRY_RUN = !process.argv.includes('--apply');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// ── Replacement lookup: old CC course name → corrected entry ─────────────────
// Global fixes (apply regardless of which course they appear in)
const GLOBAL_FIXES = {
  'Fintech': {
    course: 'Financial Technology', area: 'Finance', term: 'Term VI', credits: '3',
    faculty: 'Awaiting Approval',
  },
  'Security Analysis and Portfolio Management': {
    course: 'Security Analysis and Portfolio Management (SAPM)', area: 'Finance', term: 'Term IV', credits: '3',
    faculty: 'Prof. Soumya Guha Deb',
  },
  'Customer Relationship Management': {
    course: 'Customer Relationship Management (CRM)', area: 'Marketing', term: 'Term V', credits: '3',
    faculty: 'Prof. Sandip Mukhopadhyay & Mr. Manohar Mylavarapu',
  },
  'CRM': {
    course: 'Customer Relationship Management (CRM)', area: 'Marketing', term: 'Term V', credits: '3',
    faculty: 'Prof. Sandip Mukhopadhyay & Mr. Manohar Mylavarapu',
  },
  'Marketing Semiotics/Semiotic Strategies': {
    course: 'Marketing Semiotics (Semiotic Strategies)', area: 'Marketing', term: 'Term VI', credits: '1.5',
    faculty: 'Dr. Ridhi Agarwala',
  },
  'Agile Management with Scrum': {
    course: 'Agile in Digital Environment', area: 'Operations', term: 'Term IV', credits: '1.5',
    faculty: 'Dr. Arnab Banerjee',
  },
  'Theory of Constraints': {
    course: 'Theory of Constraints (Constraint Management)', area: 'Operations', term: 'Term VI', credits: '1.5',
    faculty: 'Prof. Harshal Lowalekar & Prof. Raghavendra Ravi',
  },
  'Law, Business and Governance': {
    course: 'Law, Business and Governance: Critical Issues', area: 'GMPPE', term: 'Term V', credits: '1.5',
    faculty: 'Prof. Sujit Kumar Pruseth',
  },
  'Mergers & Acquisitions': {
    course: 'Mergers & Acquisition', area: 'Finance', term: 'Term VI', credits: '3',
    faculty: 'Prof. Pratap Giri',
  },
  'Coaching and Mentoring for Well-being': {
    course: 'Coaching and Mentoring for Well-being: Learn to Flourish', area: 'OB-HR', term: 'Term VI', credits: '3',
    faculty: 'Prof. Atri Sengupta & Mr. Anamitra Chatterjee',
  },
};

// Context-sensitive fixes: courseId → { oldName → new entry }
const CONTEXT_FIXES = {
  // [10] M&A: "Mergers & Acquisitions (Strategy)" is a self-reference typo → Investment Banking
  10: {
    'Mergers & Acquisitions (Strategy)': {
      course: 'Investment Banking', area: 'Finance', term: 'Term IV', credits: '1.5',
      faculty: 'Prof. Pratap Giri',
      why: 'M&A transactions are structured and financed by investment banks; this course provides the deal origination, valuation, and capital markets context that underpins every M&A transaction.',
    },
  },
  // [63] Sustainability Mgmt: non-existent "Energy Markets" → Operations Strategy (already in same area/term group)
  63: {
    'Energy Markets and Pricing Strategies': {
      course: 'Operations Strategy and Competitive Advantage', area: 'Operations', term: 'Term VI', credits: '3',
      faculty: 'Prof. Kaustov Chakraborty',
      why: 'Sustainability is a core dimension of operations strategy; this course provides the competitive and systemic framework for embedding sustainable practices into long-term operational decisions.',
    },
  },
  // [95] Nonmarket Strategy: non-existent "Energy Markets" → International Economics
  95: {
    'Energy Markets and Pricing Strategies': {
      course: 'International Economics', area: 'GMPPE', term: 'Term V', credits: '3',
      faculty: 'Prof. Anasuya Haldar',
      why: 'Geopolitical risk and trade policy are shaped by international economic structures; this course provides the macroeconomic and trade-theoretic foundation for understanding nonmarket forces in global business.',
    },
  },
  // [68] Business Models & Plans: non-existent → Corporate Entrepreneurship & Innovation
  68: {
    'Entrepreneurship and Business Development': {
      course: 'Corporate Entrepreneurship & Innovation', area: 'Strategy', term: 'Term V', credits: '1.5',
      faculty: 'Prof. Sabyasachi Sinha',
      why: 'Business model design and corporate venturing are deeply intertwined; this course extends the business model canvas into the context of internal innovation and intrapreneurship within established firms.',
    },
  },
  // [73] Digital Entrepreneurship: non-existent → Impact Entrepreneurship
  73: {
    'Entrepreneurship and Business Development': {
      course: 'Impact Entrepreneurship', area: 'Strategy', term: 'Term V', credits: '3',
      faculty: 'Prof. Janvi Patel',
      why: 'Complements the digital venture lens with impact-driven venture creation; broadens the entrepreneurial toolkit from tech-enabled to purpose-led business building.',
    },
  },
  // [82] Startup Mindset: non-existent → Corporate Entrepreneurship & Innovation
  82: {
    'Entrepreneurship and Business Development': {
      course: 'Corporate Entrepreneurship & Innovation', area: 'Strategy', term: 'Term V', credits: '1.5',
      faculty: 'Prof. Sabyasachi Sinha',
      why: 'Extends the startup mindset into large-organisation contexts; shows how entrepreneurial thinking translates into corporate ventures, innovation labs, and intrapreneurial initiatives.',
    },
  },
  // [94] Entrepreneurship & Finance: non-existent → Business Models & Plans
  94: {
    'Entrepreneurship and Business Development': {
      course: 'Business Models & Plans', area: 'Strategy', term: 'Term V', credits: '3',
      faculty: 'Prof. Prashant Salvan (Awaiting Approval)',
      why: 'Entrepreneurial finance is only meaningful when paired with a robust business model; this course deepens the ability to design and stress-test the business models that require entrepreneurial funding structures.',
    },
  },
};

// ── Financial Technology (id=106): brand-new complementary courses ────────────
const FINTECH_CC = [
  {
    course: 'Blockchain and Its Applications', area: 'ISM', term: 'Term V', credits: '3',
    faculty: 'Prof. Keshav Kaushik',
    why: 'DLT and smart contracts are core FinTech infrastructure; this course deepens the blockchain foundations covered in the FinTech module on distributed ledger applications and crypto ecosystems.',
  },
  {
    course: 'AI for Financial Analytics and Decision Making', area: 'ISM', term: 'Term V', credits: '1.5',
    faculty: 'Prof. Deepanwita Datta',
    why: 'Bridges FinTech\'s coverage of robo-advising and algorithmic trading with hands-on AI/ML financial modelling tools, extending the quantitative dimension of the course into applied analytics.',
  },
  {
    course: 'Financial Risk Management', area: 'Finance', term: 'Term VI', credits: '3',
    faculty: 'Awaiting Approval',
    why: 'Digital financial services introduce novel cyber, credit, and liquidity risks; this course equips students to build enterprise risk frameworks directly applicable to FinTech business models.',
  },
];

function applyFixes(courseId, ccArray) {
  const contextMap = CONTEXT_FIXES[courseId] || {};
  return ccArray.map(cc => {
    // Check context-specific fix first
    if (contextMap[cc.course]) {
      const fix = contextMap[cc.course];
      return { ...cc, ...fix };
    }
    // Then global fix
    if (GLOBAL_FIXES[cc.course]) {
      const fix = GLOBAL_FIXES[cc.course];
      return { ...cc, ...fix };
    }
    return cc;
  });
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== APPLYING ===\n');

  const { rows } = await pool.query(
    'SELECT id, course, complementary_courses FROM courses WHERE complementary_courses IS NOT NULL ORDER BY id'
  );

  let updated = 0;

  for (const row of rows) {
    const original = row.complementary_courses || [];
    const fixed = applyFixes(row.id, original);

    // Check if anything changed
    const changed = JSON.stringify(original) !== JSON.stringify(fixed);
    if (!changed) continue;

    updated++;
    console.log(`\n[${row.id}] ${row.course}`);
    fixed.forEach((cc, i) => {
      const orig = original[i];
      const nameChanged = orig.course !== cc.course;
      console.log(`  ${i + 1}. ${nameChanged ? `${orig.course} → ${cc.course}` : cc.course}`);
    });

    if (!DRY_RUN) {
      await pool.query(
        'UPDATE courses SET complementary_courses=$1::jsonb, updated_at=NOW() WHERE id=$2',
        [JSON.stringify(fixed), row.id]
      );
    }
  }

  // Handle id=106 (no CC yet)
  console.log('\n[106] Financial Technology — adding 3 complementary courses');
  FINTECH_CC.forEach((cc, i) => console.log(`  ${i + 1}. ${cc.course} (${cc.area}, ${cc.term})`));
  if (!DRY_RUN) {
    await pool.query(
      'UPDATE courses SET complementary_courses=$1::jsonb, updated_at=NOW() WHERE id=106',
      [JSON.stringify(FINTECH_CC)]
    );
  }

  await pool.end();
  console.log(DRY_RUN
    ? `\nDry run complete — ${updated} courses with fixes + id=106 to add. Pass --apply to write.`
    : `\nDone — ${updated} courses fixed + id=106 updated.`
  );
}

main().catch(e => { console.error(e.message); process.exit(1); });
