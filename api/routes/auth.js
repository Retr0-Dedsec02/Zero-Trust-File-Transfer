require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { accessToken, refreshToken };
};

// Register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('name').trim().isLength({ min: 2 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name } = req.body;
      const existing = await db.users.findByEmail(email);
      if (existing) {
        return res.status(409).json({ error: 'Email already registered.' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await db.users.create({
        id: uuidv4(),
        email,
        password: hashedPassword,
        name,
      });

      const { accessToken, refreshToken } = generateTokens(user);
      await db.refreshTokens.save(refreshToken, user.id);

      return res.status(201).json({
        message: 'Account created successfully.',
        user: { id: user.id, email: user.email, name: user.name },
        accessToken,
        refreshToken,
      });
    } catch (err) {
      console.error('Register error:', err.message);
      return res.status(500).json({ error: 'Registration failed. Check server logs.' });
    }
  }
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      const user = await db.users.findByEmail(email);
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      const { accessToken, refreshToken } = generateTokens(user);
      await db.refreshTokens.save(refreshToken, user.id);

      return res.json({
        message: 'Login successful.',
        user: { id: user.id, email: user.email, name: user.name },
        accessToken,
        refreshToken,
      });
    } catch (err) {
      console.error('Login error:', err.message);
      return res.status(500).json({ error: 'Login failed. Check server logs.' });
    }
  }
);

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token.' });

    const found = await db.refreshTokens.find(refreshToken);
    if (!found) return res.status(403).json({ error: 'Invalid refresh token.' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await db.users.findById(decoded.userId);
    if (!user) return res.status(403).json({ error: 'User not found.' });

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    return res.json({ accessToken });
  } catch (err) {
    console.error('Refresh error:', err.message);
    return res.status(403).json({ error: 'Invalid or expired refresh token.' });
  }
});

// Logout
router.post('/logout', verifyToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await db.refreshTokens.delete(refreshToken);
    return res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    console.error('Logout error:', err.message);
    return res.status(500).json({ error: 'Logout failed.' });
  }
});

// Get current user
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await db.users.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json({ id: user.id, email: user.email, name: user.name, createdAt: user.createdAt });
  } catch (err) {
    console.error('Me error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

module.exports = router;
