require('dotenv').config();
const { pool, ensureTables } = require('../_lib/db');
const { verifyToken }        = require('../_lib/auth');
const setCors                = require('../_lib/cors');

module.exports = async (req, res) => {
  if (setCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = verifyToken(req, res);
  if (!user) return;

  try {
    await ensureTables();
    const { rows } = await pool.query(
      'SELECT id, username, email, name, role FROM users WHERE id = $1',
      [user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
