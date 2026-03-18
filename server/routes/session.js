const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const User    = require('../models/User');

// GET /api/session — return current student's saved basket
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('basket');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ basket: user.basket || [] });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/session — save student's basket
router.put('/', auth, async (req, res) => {
  try {
    const { basket } = req.body;
    if (!Array.isArray(basket)) return res.status(400).json({ message: 'basket must be an array' });

    await User.findByIdAndUpdate(req.user.id, { basket });
    res.json({ message: 'Basket saved' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
