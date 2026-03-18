const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const INST_DOMAIN = 'iimsambalpur.ac.in';

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role, name: user.name },
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

// POST /api/auth/login
// Students  → send { email, password }
// Admins    → send { username, password }
router.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password is required' });

    let user;
    if (email) {
      const normalised = email.trim().toLowerCase();
      if (!normalised.endsWith(`@${INST_DOMAIN}`))
        return res.status(400).json({ error: `Only @${INST_DOMAIN} email addresses are allowed` });
      const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [normalised]);
      user = rows[0];
    } else if (username) {
      const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username.trim().toLowerCase()]);
      user = rows[0];
    } else {
      return res.status(400).json({ error: 'Email or username is required' });
    }

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    res.json({ id: user.id, username: user.username, email: user.email, name: user.name, role: user.role, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, email, name, role FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
