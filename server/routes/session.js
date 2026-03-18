const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');
const { pool } = require('../db');

// GET /api/session — return current student's saved basket
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT basket FROM users WHERE id = $1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    res.json({ basket: rows[0].basket || [] });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/session — save student's basket
router.put('/', requireAuth, async (req, res) => {
  try {
    const { basket } = req.body;
    if (!Array.isArray(basket)) return res.status(400).json({ message: 'basket must be an array' });

    await pool.query(
      'UPDATE users SET basket = $1, updated_at = NOW() WHERE id = $2',
      [basket, req.user.id]
    );
    res.json({ message: 'Basket saved' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
