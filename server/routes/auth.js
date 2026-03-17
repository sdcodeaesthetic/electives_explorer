const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const INST_DOMAIN = 'iimsambalpur.ac.in';

function signToken(user) {
  return jwt.sign(
    { id: user._id, username: user.username, email: user.email, role: user.role, name: user.name },
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

    const existing = await User.findOne({ email: normalised });
    if (existing)
      return res.status(409).json({ error: 'An account with this email already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const user   = await User.create({ name: name.trim(), email: normalised, password: hashed, role: 'student' });

    const token = signToken(user);
    res.status(201).json({ id: user._id, email: user.email, name: user.name, role: user.role, token });
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
      // Student login via institutional email
      const normalised = email.trim().toLowerCase();
      if (!normalised.endsWith(`@${INST_DOMAIN}`))
        return res.status(400).json({ error: `Only @${INST_DOMAIN} email addresses are allowed` });
      user = await User.findOne({ email: normalised });
    } else if (username) {
      // Admin login via username
      user = await User.findOne({ username: username.trim().toLowerCase() });
    } else {
      return res.status(400).json({ error: 'Email or username is required' });
    }

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    res.json({ id: user._id, username: user.username, email: user.email, name: user.name, role: user.role, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user._id, username: user.username, email: user.email, name: user.name, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
