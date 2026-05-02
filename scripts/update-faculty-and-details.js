/**
 * One-time script: faculty corrections + Financial Technology course details
 * Run: node scripts/update-faculty-and-details.js [--apply]
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const DRY_RUN = !process.argv.includes('--apply');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function findOrCreate(name) {
  const { rows } = await pool.query('SELECT id FROM professors WHERE name = $1', [name]);
  if (rows.length) return rows[0].id;
  const ins = await pool.query('INSERT INTO professors (name) VALUES ($1) RETURNING id', [name]);
  console.log(`  + Created professor: "${name}" (id=${ins.rows[0].id})`);
  return ins.rows[0].id;
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (pass --apply to write) ===' : '=== APPLYING ===\n');

  // ── 1. Faculty changes ──────────────────────────────────────────────────────
  const changes = [
    { id: 4,   name: 'Financial Risk Management',    p1: 'Awaiting Approval',                    p2: null },
    { id: 106, name: 'Financial Technology',          p1: 'Awaiting Approval',                    p2: null },
    { id: 7,   name: 'International Finance',         p1: 'Awaiting Approval',                    p2: null },
    { id: 25,  name: 'E-Commerce',                   p1: 'Prof. Rajesh Natarajan',               p2: null },
    { id: 68,  name: 'Business Models & Plans',       p1: 'Prof. Prashant Salvan (Awaiting Approval)', p2: null },
    // id=57 Logistics and Warehouse Management already has correct faculty (Susmita Narayana + Rofin) — no change needed
  ];

  console.log('── Faculty Updates ──────────────────────────────────────────────────');
  for (const c of changes) {
    const p1Id = c.p1 ? await findOrCreate(c.p1) : null;
    const p2Id = c.p2 ? await findOrCreate(c.p2) : null;
    console.log(`  [${c.id}] ${c.name}`);
    console.log(`       → professor1: "${c.p1}" (id=${p1Id}), professor2: ${c.p2 ? `"${c.p2}" (id=${p2Id})` : 'null'}`);
    if (!DRY_RUN) {
      await pool.query(
        'UPDATE courses SET professor1_id=$1, professor2_id=$2, updated_at=NOW() WHERE id=$3',
        [p1Id, p2Id, c.id]
      );
    }
  }

  // ── 2. Financial Technology course details (from MBA Fintech Course Outline 25-26.docx) ──
  console.log('\n── Financial Technology Course Details (id=106) ──────────────────────');

  const description =
    'Technology is playing an increasingly dominant role in the financial services industry, empowering existing players and threatening to obliviate business models of entire sectors within the industry. ' +
    'The course exposes students to this fast-growing and exciting intersection between technology and finance – P2P lending, Loan processing, Blockchains, crypto currency, Bitcoins, electronic payments, ' +
    'financial applications of machine learning, robo-advising, algorithmic trading, digital transformation in banks, central bank digital currency, new approaches to KYC and AML, ' +
    'regulation of Fintech and fintech venture funding and other topics.';

  const keyTakeaways =
    '1. Fintech industry overview and ecosystem\n' +
    '2. P2P Lending – mechanisms, credit risk, and regulation\n' +
    '3. Cryptography and encryption algorithms\n' +
    '4. Blockchain / Distributed Ledger Technology and its applications\n' +
    '5. Crypto currency and Bitcoin\n' +
    '6. Initial Coin Offerings (ICO, STO, IEO)\n' +
    '7. Electronic payments and fintech payment models\n' +
    '8. Robo-advising and its impact on wealth management\n' +
    '9. Machine learning, Algorithmic trading and High-Frequency Trading (HFT)\n' +
    '10. Digital transformation in banks\n' +
    '11. Central Bank Digital Currencies (CBDCs)\n' +
    '12. AML and KYC – new approaches\n' +
    '13. InsurTech – concepts, applications, and business models\n' +
    '14. RegTech – regulatory technology and SupTech\n' +
    '15. Disruptive Technologies (Quantum computing, DAPPs)\n' +
    '16. Project evaluation for Fintech ventures and start-up funding (VC, crowdfunding)';

  const prerequisites = 'Nil';

  const curriculum =
    'Session 1: Overview of the Fintech Industry — What is Fintech, Evolution from E-Finance to Fintech, Major impact factors, Fintech ecosystem and business models, Challenges for Fintech sector\n' +
    'Session 2: P2P Lending Market — Mechanism of P2P lending, Credit risk, Managing risk for investors, Crowd funding vs P2P lending, Regulation\n' +
    'Session 3: Cryptography and Encryption Algorithms — Secret and Public key cryptography, RSA and Hash Function\n' +
    'Session 4: Blockchain – Distributed Ledger Technology — How Blockchain works, Properties and Limitations\n' +
    'Session 5: Loan Processing from a P2P Platform — Case Discussion: Lending Club; Credit Ease: Taking Inclusive Finance Online\n' +
    'Session 6: Blockchain Applications — BFSI, Trade Finance, Ripple, Cobalt DL, BCT in Capital markets, R3\n' +
    'Session 7: Blockchain Applications (Contd.) — Case Discussion: Deutsche Bank: Pursuing Blockchain Opportunities\n' +
    'Session 8: Crypto Currency and Bitcoin\n' +
    'Session 9: Initial Coin Offerings (ICO) — ICO, STO and IEO, Regulation of ICO; Case: Filecoin Initial Coin Offering\n' +
    'Session 10: Electronic Payments — E-Payment methods, Machine learning for E-Payment, Paytm; Case: Stripe: Helping Money Move on the Internet\n' +
    'Session 11: Robo-Advising — Impact on wealth management, Robo-advisory services; Case: Charles Schwab Corp.\n' +
    'Session 12: Machine Learning and Financial Applications — ML and AI in finance, Hedge Fund strategies\n' +
    'Session 13: Algorithmic Trading and HFT — Algo trading, Market microstructure, Algo analysis strategies and tools\n' +
    'Session 14: InsurTech — Fundamental concepts, Key applications, Business models\n' +
    'Session 15: RegTech — Technologies used, Regtech at HSBC, SupTech and Fintech\n' +
    'Session 16: Digital Transformation in Banks — Digital disruption and Banking Response\n' +
    'Session 17: Central Bank Digital Currencies (CBDCs) — Opportunities, Benefits, Implementation\n' +
    'Session 18: New Approaches to AML and KYC — Money Laundering, CKYC, Blockchain-based KYC\n' +
    'Session 19: Case Discussion – DBS: From the "World\'s Best Bank" to Building the Future Ready Enterprise\n' +
    'Session 20: Disruptive Technologies, Project Evaluation, Start-up Funding — Quantum computing, DAPPs, Real option analysis, VC and crowdfunding';

  console.log('  description: set');
  console.log('  key_takeaways: set (16 learning outcomes)');
  console.log('  prerequisites: Nil');
  console.log('  course_curriculum: set (20 sessions)');

  if (!DRY_RUN) {
    await pool.query(
      `UPDATE courses
       SET description=$1, key_takeaways=$2, prerequisites=$3, course_curriculum=$4, updated_at=NOW()
       WHERE id=106`,
      [description, keyTakeaways, prerequisites, curriculum]
    );
  }

  await pool.end();
  console.log(DRY_RUN ? '\nDry run complete — pass --apply to write changes.' : '\nAll changes applied.');
}

main().catch(e => { console.error(e.message); process.exit(1); });
