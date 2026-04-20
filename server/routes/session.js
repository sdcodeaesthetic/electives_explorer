const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');
const { pool } = require('../db');

// GET /api/session — return current user's saved basket + backup from user_baskets table
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT basket, backup FROM user_baskets WHERE user_id = $1',
      [req.user.id]
    );
    res.json({
      basket: rows[0]?.basket  || [],
      backup: rows[0]?.backup  || [],
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/session — upsert basket + backup into user_baskets table
router.put('/', requireAuth, async (req, res) => {
  try {
    const { basket, backup } = req.body;
    if (!Array.isArray(basket)) return res.status(400).json({ message: 'basket must be an array' });
    const safeBackup = Array.isArray(backup) ? backup : [];

    await pool.query(
      `INSERT INTO user_baskets (user_id, basket, backup, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET basket = EXCLUDED.basket, backup = EXCLUDED.backup, updated_at = NOW()`,
      [req.user.id, basket, safeBackup]
    );
    res.json({ message: 'Session saved' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
