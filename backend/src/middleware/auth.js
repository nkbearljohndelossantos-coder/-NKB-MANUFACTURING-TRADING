const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'enterprise_jwt_secret_key_change_in_production_min32chars';

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db('users').where({ id: decoded.id }).first();

    if (!user || user.status === 0 || user.status === false) {
      return res.status(403).json({ success: false, message: 'User account inactive or not found' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      role: user.role.toUpperCase(),
      client_id: user.client_id
    };

    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired session token' });
  }
}

module.exports = { authenticateToken };
