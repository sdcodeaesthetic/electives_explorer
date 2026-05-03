require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const updates = [
  { id: 38,  professor2_id: 97,  name: 'Marketing of Services',                         prof2: 'Dr. Chandan Kumar Behera' },
  { id: 41,  professor2_id: 49,  name: 'Sales & Distribution Management',                prof2: 'Prof. Sarthak Mohapatra' },
  { id: 50,  professor2_id: 56,  name: 'Service Operations Management',                  prof2: 'Prof. Rohit Gupta' },
  { id: 57,  professor2_id: 113, name: 'Logistics and Warehouse Management',             prof2: 'Prof. Rofin' },
  { id: 58,  professor2_id: 111, name: 'Project Management',                             prof2: 'Mr. Aasheesh Dixit' },
  { id: 60,  professor2_id: 88,  name: 'Operations Strategy and Competitive Advantage',  prof2: 'Dr. Rahul Pandey' },
  { id: 70,  professor2_id: 58,  name: 'Corporate Strategy',                             prof2: 'Prof. Dr. Aarti Singh' },
  { id: 94,  professor2_id: 32,  name: 'Entrepreneurship & Finance',                     prof2: 'Prof. Diwahar Nadar' },
];

async function run() {
  for (const u of updates) {
    await pool.query(
      'UPDATE courses SET professor2_id=$1, updated_at=NOW() WHERE id=$2',
      [u.professor2_id, u.id]
    );
    console.log('[' + u.id + '] ' + u.name + ' → professor2: ' + u.prof2);
  }
  await pool.end();
  console.log('Done — 8 courses updated.');
}
run().catch(e => { console.error(e.message); process.exit(1); });
