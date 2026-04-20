const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');
const { pool } = require('../db');

const MAX_PLANNERS = 5;

// GET /api/planners — list all saved planners for the current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, basket, created_at, updated_at FROM planners WHERE user_id = $1 ORDER BY created_at ASC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/planners — save a new named plan (max 5 per user)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, basket } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0)
      return res.status(400).json({ message: 'Plan name is required' });
    if (!Array.isArray(basket))
      return res.status(400).json({ message: 'basket must be an array' });

    // Enforce per-user limit
    const { rows: existing } = await pool.query(
      'SELECT COUNT(*) FROM planners WHERE user_id = $1',
      [req.user.id]
    );
    if (parseInt(existing[0].count) >= MAX_PLANNERS)
      return res.status(400).json({ message: `Maximum of ${MAX_PLANNERS} saved plans allowed. Delete one to create a new plan.` });

    const { rows } = await pool.query(
      `INSERT INTO planners (user_id, name, basket, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, name, basket, created_at, updated_at`,
      [req.user.id, name.trim().slice(0, 120), basket]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/planners/:id — update name and/or basket of an existing plan
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, basket } = req.body;

    // Verify ownership
    const { rows: check } = await pool.query(
      'SELECT id FROM planners WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (!check.length) return res.status(404).json({ message: 'Plan not found' });

    const updates = [];
    const params  = [];
    if (name !== undefined) { params.push(String(name).trim().slice(0, 120)); updates.push(`name = $${params.length}`); }
    if (Array.isArray(basket)) { params.push(basket); updates.push(`basket = $${params.length}`); }
    if (!updates.length) return res.status(400).json({ message: 'Nothing to update' });

    params.push(id);
    const { rows } = await pool.query(
      `UPDATE planners SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING id, name, basket, created_at, updated_at`,
      params
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/planners/:id — delete a saved plan (owner only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { rowCount } = await pool.query(
      'DELETE FROM planners WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ message: 'Plan not found' });
    res.json({ message: 'Plan deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
