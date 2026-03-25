// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { pool } = require('../config/db');

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const { name, email, password, role = 'consumer', avatar = '🙂' } = req.body;

    // Check duplicate email
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role, avatar) VALUES (?, ?, ?, ?, ?)',
      [name, email, hash, role, avatar]
    );

    const token = signToken({ id: result.insertId, name, email, role });
    res.status(201).json({
      success: true,
      message: 'Registered successfully',
      token,
      user: { id: result.insertId, name, email, role, avatar },
    });
  } catch (err) { next(err); }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signToken({ id: user.id, name: user.name, email: user.email, role: user.role });
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err) { next(err); }
}

// GET /api/auth/me
async function me(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, avatar, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: rows[0] });
  } catch (err) { next(err); }
}

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
}

module.exports = { register, login, me };
