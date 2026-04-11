const express = require('express');
const router  = express.Router();
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/professor-ratings/by-course/:courseId
// Returns ratings for the professor currently assigned to this course.
// If the professor changes, old ratings remain keyed to the old name.
router.get('/by-course/:courseId', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);

    // Get current primary professor name via JOIN
    const courseRes = await pool.query(
      `SELECT p.name AS faculty FROM courses c
       LEFT JOIN professors p ON p.id = c.professor1_id
       WHERE c.id = $1`, [courseId]);
    if (!courseRes.rows.length) return res.status(404).json({ error: 'Course not found' });

    const faculty = courseRes.rows[0].faculty;
    const { rows } = await pool.query(
      `SELECT * FROM professor_ratings
        WHERE professor_name = $1
        ORDER BY created_at DESC`,
      [faculty]
    );
    res.json({ professor: faculty, ratings: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/professor-ratings/by-name/:professorName
// Returns all ratings for a professor across all courses.
router.get('/by-name/:professorName', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT pr.*, c.course AS course_name
         FROM professor_ratings pr
         LEFT JOIN courses c ON c.id = pr.course_id
        WHERE pr.professor_name = $1
        ORDER BY pr.created_at DESC`,
      [req.params.professorName]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/professor-ratings/:courseId — authenticated users only
// Captures professor_name from the course at the time of rating.
router.post('/:courseId', requireAuth, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ error: 'rating must be between 1 and 5' });

    // Get current primary professor name via JOIN
    const courseRes = await pool.query(
      `SELECT p.name AS faculty FROM courses c
       LEFT JOIN professors p ON p.id = c.professor1_id
       WHERE c.id = $1`, [courseId]);
    if (!courseRes.rows.length) return res.status(404).json({ error: 'Course not found' });
    const professorName = courseRes.rows[0].faculty;

    // Upsert: one rating per user per professor per course
    const { rows } = await pool.query(
      `INSERT INTO professor_ratings (professor_name, course_id, user_id, user_name, rating, comment)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (professor_name, user_id, course_id)
       DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = NOW()
       RETURNING *`,
      [professorName, courseId, req.user.id, req.user.name, parseInt(rating), (comment || '').trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/professor-ratings/:id — admin only
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM professor_ratings WHERE id = $1', [parseInt(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
