require('dotenv').config();
const { pool, ensureTables } = require('../_lib/db');
const setCors                = require('../_lib/cors');

module.exports = async (req, res) => {
  if (setCors(req, res)) return;

  const courseId = req.query.courseId;
  if (!courseId) return res.status(400).json({ error: 'courseId required' });

  try {
    await ensureTables();

    // GET /api/reviews/:courseId
    if (req.method === 'GET') {
      const { rows } = await pool.query(
        `SELECT id, course_id, username, name, course_rating, prof_rating, comment, created_at
         FROM reviews WHERE course_id = $1 ORDER BY created_at DESC`,
        [courseId]
      );
      return res.json(rows.map(r => ({
        id:           r.id,
        username:     r.username,
        name:         r.name,
        courseRating: parseFloat(r.course_rating) || 0,
        profRating:   parseFloat(r.prof_rating)   || 0,
        comment:      r.comment || '',
        timestamp:    r.created_at,
      })));
    }

    // POST /api/reviews/:courseId
    if (req.method === 'POST') {
      const { username, name, courseRating, profRating, comment } = req.body;
      if (!username) return res.status(400).json({ error: 'username required' });

      const { rows } = await pool.query(
        `INSERT INTO reviews (course_id, username, name, course_rating, prof_rating, comment)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, username, name, course_rating, prof_rating, comment, created_at`,
        [courseId, username, name || username, Number(courseRating) || 0,
         Number(profRating) || 0, (comment || '').trim()]
      );
      const r = rows[0];
      return res.status(201).json({
        id:           r.id,
        username:     r.username,
        name:         r.name,
        courseRating: parseFloat(r.course_rating) || 0,
        profRating:   parseFloat(r.prof_rating)   || 0,
        comment:      r.comment || '',
        timestamp:    r.created_at,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
