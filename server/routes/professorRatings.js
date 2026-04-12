const express = require('express');
const router  = express.Router();
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/professor-ratings/by-course/:courseId
// Returns ratings grouped by professor — both professor1 AND professor2.
router.get('/by-course/:courseId', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);

    const courseRes = await pool.query(
      `SELECT
         p1.id   AS p1_id,   p1.name AS p1_name,
         p2.id   AS p2_id,   p2.name AS p2_name
       FROM courses c
       LEFT JOIN professors p1 ON p1.id = c.professor1_id
       LEFT JOIN professors p2 ON p2.id = c.professor2_id
       WHERE c.id = $1`, [courseId]);

    if (!courseRes.rows.length) return res.status(404).json({ error: 'Course not found' });
    const { p1_id, p1_name, p2_id, p2_name } = courseRes.rows[0];

    const professors = [];

    if (p1_name) {
      const { rows } = await pool.query(
        `SELECT * FROM professor_ratings
          WHERE professor_name = $1 AND course_id = $2
          ORDER BY created_at DESC`,
        [p1_name, courseId]);
      professors.push({ id: p1_id, name: p1_name, ratings: rows });
    }

    if (p2_name) {
      const { rows } = await pool.query(
        `SELECT * FROM professor_ratings
          WHERE professor_name = $1 AND course_id = $2
          ORDER BY created_at DESC`,
        [p2_name, courseId]);
      professors.push({ id: p2_id, name: p2_name, ratings: rows });
    }

    res.json({ professors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/professor-ratings/by-name/:professorName
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
// Body: { rating, comment, professor_id }
router.post('/:courseId', requireAuth, async (req, res) => {
  try {
    const courseId    = parseInt(req.params.courseId);
    const { rating, comment, professor_id } = req.body;

    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ error: 'rating must be between 1 and 5' });

    let professorName;
    if (professor_id) {
      const profRes = await pool.query(
        'SELECT name FROM professors WHERE id = $1', [parseInt(professor_id)]);
      if (!profRes.rows.length) return res.status(404).json({ error: 'Professor not found' });
      professorName = profRes.rows[0].name;
    } else {
      // fallback: professor1
      const courseRes = await pool.query(
        `SELECT p.name AS faculty FROM courses c
         LEFT JOIN professors p ON p.id = c.professor1_id
         WHERE c.id = $1`, [courseId]);
      if (!courseRes.rows.length) return res.status(404).json({ error: 'Course not found' });
      professorName = courseRes.rows[0].faculty;
    }

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
