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

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ id: user.id, username: user.username, email: user.email, name: user.name, role: user.role, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
