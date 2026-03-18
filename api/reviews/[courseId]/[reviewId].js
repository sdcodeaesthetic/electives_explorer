require('dotenv').config();
const { pool, ensureTables }       = require('../../_lib/db');
const { verifyToken, requireAdmin } = require('../../_lib/auth');
const setCors                       = require('../../_lib/cors');

module.exports = async (req, res) => {
  if (setCors(req, res)) return;
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  const user = verifyToken(req, res);
  if (!user) return;
  if (!requireAdmin(user, res)) return;

  const { courseId, reviewId } = req.query;

  try {
    await ensureTables();
    const result = await pool.query(
      'DELETE FROM reviews WHERE id = $1 AND course_id = $2',
      [reviewId, courseId]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: 'Review not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
