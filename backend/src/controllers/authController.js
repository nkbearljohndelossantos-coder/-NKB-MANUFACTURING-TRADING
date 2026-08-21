const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { logAudit } = require('../services/auditService');

const JWT_SECRET = process.env.JWT_SECRET || 'enterprise_jwt_secret_key_change_in_production_min32chars';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const user = await db('users').where({ username }).first();
    if (!user || user.status === 0 || user.status === false) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or inactive account' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    let clientInfo = null;
    if (user.role.toUpperCase() === 'CLIENT' && user.client_id) {
      clientInfo = await db('b2b_clients').where({ id: user.client_id }).first();
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role.toUpperCase(),
        client_id: user.client_id
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    await logAudit({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'users',
      entityId: user.id,
      reason: 'Successful user authentication',
      ipAddress: req.ip
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role.toUpperCase(),
        client_id: user.client_id,
        client: clientInfo
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    let clientInfo = null;
    if (req.user.role === 'CLIENT' && req.user.client_id) {
      clientInfo = await db('b2b_clients').where({ id: req.user.client_id }).first();
    }

    res.json({
      success: true,
      user: {
        ...req.user,
        client: clientInfo
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getStaffUsers = async (req, res, next) => {
  try {
    const users = await db('users')
      .select('id', 'username', 'full_name', 'email', 'role', 'client_id', 'status', 'created_at')
      .orderBy('id', 'asc');
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};
