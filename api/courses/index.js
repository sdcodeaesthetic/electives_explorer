require('dotenv').config();
const { pool, ensureTables } = require('../_lib/db');
const setCors                = require('../_lib/cors');
const { verifyToken, requireAdmin } = require('../_lib/auth');
const coursesJSON            = require('../../server/data/courses.json');

// Merge base JSON with any admin overrides stored in DB
async function getMergedCourses() {
  const { rows } = await pool.query('SELECT course_id, data FROM course_overrides');
  const overrides = Object.fromEntries(rows.map(r => [r.course_id, r.data]));
  return coursesJSON.map(c => overrides[c.id] ? { ...c, ...overrides[c.id] } : c);
}

module.exports = async (req, res) => {
  if (setCors(req, res)) return;

  try {
    await ensureTables();

    // GET /api/courses
    if (req.method === 'GET') {
      let result = await getMergedCourses();
      const { area, credits, faculty, search } = req.query;

      if (area) {
        const areas = area.split(',').map(a => a.trim().toLowerCase());
        result = result.filter(c => areas.includes(c.area.toLowerCase()));
      }
      if (credits) {
        result = result.filter(c => c.credits === parseFloat(credits));
      }
      if (faculty) {
        const q = faculty.toLowerCase();
        result = result.filter(c => c.faculty.toLowerCase().includes(q));
      }
      if (search) {
        const q = search.toLowerCase();
        result = result.filter(c =>
          c.course.toLowerCase().includes(q) ||
          c.faculty.toLowerCase().includes(q) ||
          c.area.toLowerCase().includes(q)
        );
      }
      return res.json(result);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
