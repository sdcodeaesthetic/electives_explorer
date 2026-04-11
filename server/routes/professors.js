const express = require('express');
const router  = express.Router();
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/professors — list all professors sorted by name
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM professors ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/professors — admin: create a professor
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

    const { rows } = await pool.query(
      `INSERT INTO professors (name) VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING *`,
      [name.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/professors/:id — admin: rename a professor
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

    const { rows } = await pool.query(
      'UPDATE professors SET name = $1 WHERE id = $2 RETURNING *',
      [name.trim(), parseInt(req.params.id)]
    );
    if (!rows.length) return res.status(404).json({ error: 'Professor not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
