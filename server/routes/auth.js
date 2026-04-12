const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const INST_DOMAIN = 'iimsambalpur.ac.in';

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/register  — students only
router.post('/register', async (req, res) => {
  try {
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
    const token = signToken(user);
    res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login  — both students and admins use email
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const normalised = email.trim().toLowerCase();
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [normalised]);
    const user = rows[0];

    if (!user) return res.status(404).json({
      error: 'No account found for this email address. Please create an account first.',
    });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Incorrect password. Please try again.' });

    const token = signToken(user);
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password  — students only
// Body: { name, email, password }
router.post('/reset-password', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and new password are required.' });

    const normalised = email.trim().toLowerCase();
    if (!normalised.endsWith(`@${INST_DOMAIN}`))
      return res.status(400).json({ error: `Only @${INST_DOMAIN} email addresses are allowed.` });

    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const { rows } = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND role = $2',
      [normalised, 'student']
    );
    if (!rows.length)
      return res.status(404).json({ error: 'No student account found with this email address.' });

    const hashed = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, rows[0].id]);

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
