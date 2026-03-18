require('dotenv').config();
const { pool, ensureTables } = require('../_lib/db');
const { verifyToken }        = require('../_lib/auth');
const setCors                = require('../_lib/cors');

module.exports = async (req, res) => {
  if (setCors(req, res)) return;

  const user = verifyToken(req, res);
  if (!user) return;

  try {
    await ensureTables();

    // GET /api/session
    if (req.method === 'GET') {
      const { rows } = await pool.query('SELECT basket FROM users WHERE id = $1', [user.id]);
      if (!rows.length) return res.status(404).json({ error: 'User not found' });
      return res.json({ basket: rows[0].basket || [] });
    }

    // PUT /api/session
    if (req.method === 'PUT') {
      const { basket } = req.body;
      if (!Array.isArray(basket))
        return res.status(400).json({ error: 'basket must be an array' });
      await pool.query(
        'UPDATE users SET basket = $1, updated_at = NOW() WHERE id = $2',
        [basket, user.id]
      );
      return res.json({ message: 'Basket saved' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
