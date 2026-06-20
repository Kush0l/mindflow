/**
 * @fileoverview Serverless endpoint for user registration.
 *
 * @author MindFlow Team
 * @version 1.0.0
 */

'use strict';

const { initDb, query } = require('../../lib/db');
const { setSecurityHeaders, isRateLimited, sanitizeInput, generateToken } = require('../../lib/security');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

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
  const cleanPassword = password; // Do not sanitize passwords (characters can be special symbols)

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }

  if (!cleanPassword || cleanPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
  }

  const hasDb = !!process.env.DATABASE_URL;
  if (!hasDb) {
    return res.status(500).json({
      success: false,
      message: 'Database is not configured. User registration is unavailable.',
    });
  }

  try {
    await initDb();

    // Check if user already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Hash password and insert
    const id = crypto.randomUUID();
    const hash = await bcrypt.hash(cleanPassword, 10);

    await query(
      'INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)',
      [id, cleanEmail, hash]
    );

    // Generate JWT Session Token
    const userPayload = { id, email: cleanEmail };
    const token = generateToken(userPayload);

    return res.status(201).json({
      success: true,
      token,
      user: userPayload,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      error: error.message,
    });
  }
};
