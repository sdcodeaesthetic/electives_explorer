const express = require('express');
const router  = express.Router();
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/course-ratings/:courseId
router.get('/:courseId', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const { rows } = await pool.query(
      `SELECT * FROM course_ratings WHERE course_id = $1 ORDER BY created_at DESC`,
      [courseId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/course-ratings/:courseId — authenticated users only
router.post('/:courseId', requireAuth, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ error: 'rating must be between 1 and 5' });

    // Upsert: one rating per user per course
    const { rows } = await pool.query(
      `INSERT INTO course_ratings (course_id, user_id, user_name, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (course_id, user_id)
       DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = NOW()
       RETURNING *`,
      [courseId, req.user.id, req.user.name, parseInt(rating), (comment || '').trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/course-ratings/:id — admin only
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM course_ratings WHERE id = $1', [parseInt(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
