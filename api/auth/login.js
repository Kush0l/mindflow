/**
 * @fileoverview Serverless endpoint for user login.
 *
 * @author MindFlow Team
 * @version 1.0.0
 */

'use strict';

const { initDb, query } = require('../../lib/db');
const { setSecurityHeaders, isRateLimited, sanitizeInput, generateToken } = require('../../lib/security');
const bcrypt = require('bcryptjs');

module.exports = async (req, res) => {
  setSecurityHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  if (isRateLimited(ip)) {
    return res.status(429).json({ success: false, message: 'Too many requests. Please slow down.' });
  }

  const { email, password } = req.body;

  const cleanEmail = sanitizeInput(email).toLowerCase();
  const cleanPassword = password;

  if (!cleanEmail || !cleanPassword) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const hasDb = !!process.env.DATABASE_URL;
  if (!hasDb) {
    return res.status(500).json({
      success: false,
      message: 'Database is not configured. Login is unavailable.',
    });
  }

  try {
    await initDb();

    // Fetch user details
    const result = await query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [cleanEmail]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ success: false, message: 'Incorrect email or password.' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(cleanPassword, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect email or password.' });
    }

    // Generate token
    const userPayload = { id: user.id, email: user.email };
    const token = generateToken(userPayload);

    return res.json({
      success: true,
      token,
      user: userPayload,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
      error: error.message,
    });
  }
};
