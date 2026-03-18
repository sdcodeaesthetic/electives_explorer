require('dotenv').config();
const setCors     = require('../_lib/cors');
const coursesJSON = require('../../server/data/courses.json');

module.exports = async (req, res) => {
  if (setCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const areas        = [...new Set(coursesJSON.map(c => c.area))].sort();
  const faculties    = [...new Set(coursesJSON.map(c => c.faculty))].sort();
  const creditValues = [...new Set(coursesJSON.map(c => c.credits).filter(Boolean))].sort((a, b) => a - b);
  res.json({ areas, faculties, creditValues });
};
