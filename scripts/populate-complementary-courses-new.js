/**
 * Adds complementary_courses (jsonb) for the 5 new courses:
 *   107 – Macroeconomics for Business and Financial Strategy
 *   108 – Integrated Marketing Communication
 *   109 – Agile in Digital Environment
 *   110 – Applied Optimization and Analytics
 *   111 – Corporate Entrepreneurship & Innovation
 *
 * Run: node scripts/populate-complementary-courses-new.js [--apply]
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const DRY_RUN = !process.argv.includes('--apply');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const courses = [

  {
    id: 107,
    name: 'Macroeconomics for Business and Financial Strategy',
    complementary_courses: [
      {
        course: 'Game Theory and Strategic Decision Making',
        area: 'GMPPE', term: 'Term V', credits: '3',
        faculty: 'Prof. Soumya Kanta Mishra',
        why: 'Game theory models complement macro equilibrium analysis; both courses apply quantitative reasoning to competitive and strategic decision-making.',
      },
      {
        course: 'International Economics',
        area: 'GMPPE', term: 'Term V', credits: '3',
        faculty: 'Prof. Anasuya Haldar',
        why: 'Extends macro open-economy analysis into trade theory, global value chains, and cross-border investment strategy.',
      },
      {
        course: 'Financial Risk Management',
        area: 'Finance', term: 'Term VI', credits: '3',
        faculty: 'Awaiting Approval',
        why: 'Translates macro variables—interest rates, FX, inflation—into enterprise risk frameworks for hedging and capital management.',
      },
    ],
  },

  {
    id: 108,
    name: 'Integrated Marketing Communication',
    complementary_courses: [
      {
        course: 'Brand Management',
        area: 'Marketing', term: 'Term IV', credits: '3',
        faculty: 'Prof. Poonam Kumar & Dr. Anurag Dugar',
        why: 'IMC execution depends on a coherent brand platform; Brand Management provides the brand strategy and equity foundations that IMC brings to life across channels.',
      },
      {
        course: 'Consumer Behaviour and Neuromarketing',
        area: 'Marketing', term: 'Term V', credits: '3',
        faculty: 'Prof. Nitin Soni & Prof. Poonam Kumar',
        why: 'Deep consumer insight is the engine of great communication; this course provides the psychological and behavioural foundation for developing resonant IMC campaigns.',
      },
      {
        course: 'Digital Marketing',
        area: 'Marketing', term: 'Term V', credits: '1.5',
        faculty: 'Prof. Anoop T S',
        why: 'Digital thinking is woven throughout modern IMC; deepens expertise in digital channels, analytics, and paid/owned/earned media strategies central to any contemporary campaign.',
      },
    ],
  },

  {
    id: 109,
    name: 'Agile in Digital Environment',
    complementary_courses: [
      {
        course: 'Project Management',
        area: 'Operations', term: 'Term IV', credits: '3',
        faculty: 'Prof. Rohit Gupta & Mr. Aasheesh Dixit',
        why: 'Provides traditional PM frameworks that Agile complements; understanding Waterfall and PMBOK makes the shift to Agile thinking more deliberate and contextual.',
      },
      {
        course: 'Managing Digital Transformation',
        area: 'ISM', term: 'Term V', credits: '3',
        faculty: 'Prof. A Manish Kumar',
        why: 'Scales Agile execution to enterprise-level digital transformation strategy; explores how Agile enables organisational change in tech-driven environments.',
      },
      {
        course: 'Digital Supply Chains',
        area: 'Operations', term: 'Term V', credits: '3',
        faculty: 'Prof. Harshad Sonar & Prof. Kaustov Chakraborty',
        why: 'Applies Agile and Lean principles to supply chain digitalization; extends the course\'s non-IT Agile context into logistics and operations domains.',
      },
    ],
  },

  {
    id: 110,
    name: 'Applied Optimization and Analytics',
    complementary_courses: [
      {
        course: 'Operations Analytics',
        area: 'Operations', term: 'Term IV', credits: '1.5',
        faculty: 'Prof. Rohit Gupta',
        why: 'Provides the foundational analytics and modelling mindset that AOA extends into advanced OR domains; covers descriptive and predictive analytics as a precursor.',
      },
      {
        course: 'Supply Chain Analytics',
        area: 'Operations', term: 'Term V', credits: '3',
        faculty: 'Mr. Sanjeev Das',
        why: 'Direct application domain for OR models taught in AOA; transportation, network flow, and optimization methods are applied to real supply chain problems.',
      },
      {
        course: 'Decision Making Tools for Managers',
        area: 'Operations', term: 'Term IV', credits: '3',
        faculty: 'Dr. Bhawana Rathore',
        why: 'Builds the quantitative decision-making foundation—LP, probability, and statistical methods—that AOA extends into advanced OR and metaheuristics.',
      },
    ],
  },

  {
    id: 111,
    name: 'Corporate Entrepreneurship & Innovation',
    complementary_courses: [
      {
        course: 'Business Models & Plans',
        area: 'Strategy', term: 'Term V', credits: '3',
        faculty: 'Prof. Prashant Salvan (Awaiting Approval)',
        why: 'Corporate ventures require new business model thinking; this course deepens the ability to design, stress-test, and pitch the business models that CE initiatives produce.',
      },
      {
        course: 'Impact Entrepreneurship',
        area: 'Strategy', term: 'Term V', credits: '3',
        faculty: 'Prof. Janvi Patel',
        why: 'Complements the corporate context with independent and social venture creation; expands the entrepreneurship toolkit from internal innovation to market-creating initiatives.',
      },
      {
        course: 'Managing Strategic Transformations',
        area: 'Strategy', term: 'Term V', credits: '1.5',
        faculty: 'Prof. Sanjeev Kumar Govil',
        why: 'Corporate entrepreneurship is fundamentally about transforming established organizations; provides the change management and transformation leadership skills needed to execute CE programs.',
      },
    ],
  },

];

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (pass --apply to write) ===' : '=== APPLYING ===\n');

  for (const c of courses) {
    console.log(`\n[${c.id}] ${c.name}`);
    c.complementary_courses.forEach((cc, i) =>
      console.log(`  ${i + 1}. ${cc.course} (${cc.area}, ${cc.term}) — ${cc.why.slice(0, 70)}…`)
    );

    if (!DRY_RUN) {
      await pool.query(
        'UPDATE courses SET complementary_courses=$1::jsonb, updated_at=NOW() WHERE id=$2',
        [JSON.stringify(c.complementary_courses), c.id]
      );
    }
  }

  await pool.end();
  console.log(DRY_RUN
    ? '\nDry run complete — pass --apply to write changes.'
    : '\nAll 5 courses updated with complementary courses.'
  );
}

main().catch(e => { console.error(e.message); process.exit(1); });
