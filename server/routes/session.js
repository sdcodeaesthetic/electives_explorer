const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');
const { pool } = require('../db');

// GET /api/session — return current user's saved basket from user_baskets table
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT basket FROM user_baskets WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ basket: rows[0]?.basket || [] });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/session — upsert basket into user_baskets table
router.put('/', requireAuth, async (req, res) => {
  try {
    const { basket } = req.body;
    if (!Array.isArray(basket)) return res.status(400).json({ message: 'basket must be an array' });

    await pool.query(
      `INSERT INTO user_baskets (user_id, basket, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET basket = EXCLUDED.basket, updated_at = NOW()`,
      [req.user.id, basket]
    );
    res.json({ message: 'Basket saved' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
