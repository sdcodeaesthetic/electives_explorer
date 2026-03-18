require('dotenv').config();
const { pool, ensureTables } = require('./_lib/db');
const setCors                = require('./_lib/cors');

module.exports = async (req, res) => {
  if (setCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await ensureTables();
    const { rows } = await pool.query('SELECT current_database() AS db');
    res.json({ status: 'ok', db: rows[0].db });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
};
