const express = require('express');
const router  = express.Router();
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Shared SELECT that joins professors and returns a computed `faculty` string
// for backward-compat with all frontend code that reads course.faculty
const COURSE_SELECT = `
  SELECT
    c.id, c.area, c.term, c.course, c.credits, c.description,
    c.key_takeaways, c.prerequisites, c.course_curriculum,
    c.summary, c.complementary_courses,
    c.professor1_id, c.professor2_id,
    p1.name AS professor1_name,
    p2.name AS professor2_name,
    CASE
      WHEN p2.name IS NOT NULL THEN p1.name || ' & ' || p2.name
      ELSE p1.name
    END AS faculty,
    c.created_at, c.updated_at
  FROM courses c
  LEFT JOIN professors p1 ON p1.id = c.professor1_id
  LEFT JOIN professors p2 ON p2.id = c.professor2_id
`;

// GET /api/courses
router.get('/', async (req, res) => {
  try {
    const { area, credits, faculty, search, term } = req.query;
    let where  = 'WHERE 1=1';
    const params = [];

    if (area) {
      const areas = area.split(',').map(a => a.trim());
      params.push(areas);
      where += ` AND c.area = ANY($${params.length}::text[])`;
    }
    if (credits) {
      params.push(parseFloat(credits));
      where += ` AND c.credits = $${params.length}`;
    }
    if (faculty) {
      params.push(`%${faculty}%`);
      where += ` AND (p1.name ILIKE $${params.length} OR p2.name ILIKE $${params.length})`;
    }
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (c.course ILIKE $${params.length} OR p1.name ILIKE $${params.length} OR p2.name ILIKE $${params.length} OR c.area ILIKE $${params.length})`;
    }
    if (term) {
      params.push(term);
      where += ` AND c.term = $${params.length}`;
    }

    const { rows } = await pool.query(
      `${COURSE_SELECT} ${where} ORDER BY c.id ASC`,
      params
    );
    res.json(rows.map(r => ({ ...r, credits: r.credits != null ? parseFloat(r.credits) : null })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/courses/meta
router.get('/meta', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT c.area, c.credits, p1.name AS p1, p2.name AS p2
      FROM courses c
      LEFT JOIN professors p1 ON p1.id = c.professor1_id
      LEFT JOIN professors p2 ON p2.id = c.professor2_id
      ORDER BY c.area
    `);
    const areas        = [...new Set(rows.map(r => r.area))].sort();
    const faculties    = [...new Set(rows.flatMap(r => [r.p1, r.p2].filter(Boolean)))].sort();
    const creditValues = [...new Set(rows.map(r => r.credits).filter(Boolean))].sort((a, b) => a - b);
    res.json({ areas, faculties, creditValues });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/courses/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `${COURSE_SELECT} WHERE c.id = $1`,
      [parseInt(req.params.id)]
    );
    if (!rows.length) return res.status(404).json({ error: 'Course not found' });
    const r = rows[0];
    res.json({ ...r, credits: r.credits != null ? parseFloat(r.credits) : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/courses — admin only
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { area, term, course, professor1_id, professor2_id, credits, description, key_takeaways, prerequisites, course_curriculum } = req.body;
    if (!area || !term || !course || !professor1_id)
      return res.status(400).json({ error: 'area, term, course and professor1_id are required' });

    const { rows } = await pool.query(
      `INSERT INTO courses (area, term, course, professor1_id, professor2_id, credits, description, key_takeaways, prerequisites, course_curriculum)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [area, term, course, professor1_id, professor2_id || null, credits ?? null, description || '', key_takeaways || '', prerequisites || '', course_curriculum || '']
    );

    const { rows: full } = await pool.query(`${COURSE_SELECT} WHERE c.id = $1`, [rows[0].id]);
    const f = full[0];
    res.status(201).json({ ...f, credits: f.credits != null ? parseFloat(f.credits) : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/courses/:id — admin only
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { area, term, course, professor1_id, professor2_id, credits, description, key_takeaways, prerequisites, course_curriculum } = req.body;

    await pool.query(
      `UPDATE courses
          SET area              = COALESCE($1, area),
              term              = COALESCE($2, term),
              course            = COALESCE($3, course),
              professor1_id     = COALESCE($4, professor1_id),
              professor2_id     = $5,
              credits           = COALESCE($6, credits),
              description       = COALESCE($7, description),
              key_takeaways     = COALESCE($8, key_takeaways),
              prerequisites     = COALESCE($9, prerequisites),
              course_curriculum = COALESCE($10, course_curriculum),
              updated_at        = NOW()
        WHERE id = $11`,
      [area, term, course, professor1_id, professor2_id ?? null, credits ?? null, description, key_takeaways ?? null, prerequisites ?? null, course_curriculum ?? null, id]
    );

    const { rows } = await pool.query(`${COURSE_SELECT} WHERE c.id = $1`, [id]);
    if (!rows.length) return res.status(404).json({ error: 'Course not found' });
    const r = rows[0];
    res.json({ ...r, credits: r.credits != null ? parseFloat(r.credits) : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/courses/:id — admin only
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM courses WHERE id = $1', [parseInt(req.params.id)]);
    if (!rowCount) return res.status(404).json({ error: 'Course not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
