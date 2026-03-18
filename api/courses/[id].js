require('dotenv').config();
const { pool, ensureTables }       = require('../_lib/db');
const { verifyToken, requireAdmin } = require('../_lib/auth');
const setCors                       = require('../_lib/cors');
const coursesJSON                   = require('../../server/data/courses.json');

module.exports = async (req, res) => {
  if (setCors(req, res)) return;

  const id = parseInt(req.query.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid course id' });

  // PUT /api/courses/:id  — admin only
  if (req.method === 'PUT') {
    const user = verifyToken(req, res);
    if (!user) return;
    if (!requireAdmin(user, res)) return;

    try {
      await ensureTables();

      const base    = coursesJSON.find(c => c.id === id);
      if (!base) return res.status(404).json({ error: 'Course not found' });

      const allowed = ['course', 'faculty', 'area', 'term', 'credits', 'description'];
      const update  = {};
      allowed.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });

      await pool.query(
        `INSERT INTO course_overrides (course_id, data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (course_id)
         DO UPDATE SET data = course_overrides.data || $2, updated_at = NOW()`,
        [id, JSON.stringify(update)]
      );

      // Fetch the final merged record
      const { rows } = await pool.query(
        'SELECT data FROM course_overrides WHERE course_id = $1', [id]
      );
      const merged = { ...base, ...(rows[0]?.data || {}) };
      return res.json(merged);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // DELETE /api/courses/:id — admin only (remove override, restores to JSON baseline)
  if (req.method === 'DELETE') {
    const user = verifyToken(req, res);
    if (!user) return;
    if (!requireAdmin(user, res)) return;

    try {
      await ensureTables();
      await pool.query('DELETE FROM course_overrides WHERE course_id = $1', [id]);
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
