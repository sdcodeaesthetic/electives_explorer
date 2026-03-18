const jwt = require('jsonwebtoken');

function verifyToken(req, res) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }
  try {
    return jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }
}

function requireAdmin(user, res) {
  if (user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return false;
  }
  return true;
}

module.exports = { verifyToken, requireAdmin };
