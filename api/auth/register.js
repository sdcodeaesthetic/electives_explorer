require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { pool, ensureTables } = require('../_lib/db');
const setCors = require('../_lib/cors');

const INST_DOMAIN = 'iimsambalpur.ac.in';

module.exports = async (req, res) => {
  if (setCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await ensureTables();

    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required' });

    const normalised = email.trim().toLowerCase();
    if (!normalised.endsWith(`@${INST_DOMAIN}`))
      return res.status(400).json({ error: `Only @${INST_DOMAIN} email addresses are allowed` });

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalised]);
    if (existing.rows.length)
      return res.status(409).json({ error: 'An account with this email already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, 'student')
       RETURNING id, email, name, role`,
      [name.trim(), normalised, hashed]
    );
    const user  = rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
