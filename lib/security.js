/**
 * @fileoverview Security middleware and validation utilities.
 * Handles HTML sanitization, input validation, and IP-based rate limiting.
 *
 * @author MindFlow Team
 * @version 1.0.0
 */

'use strict';

/** @type {Map<string, Array<number>>} In-memory store for rate limiting */
const requestLog = new Map();

// Periodic cleanup of rate limit logs (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  const threshold = now - 60000; // 1 minute window
  for (const [ip, timestamps] of requestLog.entries()) {
    const validTimestamps = timestamps.filter((t) => t > threshold);
    if (validTimestamps.length === 0) {
      requestLog.delete(ip);
    } else {
      requestLog.set(ip, validTimestamps);
    }
  }
}, 600000).unref(); // unref prevents blocking process exit in tests

/**
 * Checks if a request exceeds the rate limit.
 * Implements a 1-minute sliding window rate limiter.
 *
 * @param {string} ip - Client IP address
 * @param {number} [limit=15] - Maximum requests allowed per window
 * @param {number} [windowMs=60000] - Window duration in milliseconds (default 1 min)
 * @returns {boolean} True if the request is rate-limited, false otherwise
 */
function isRateLimited(ip, limit = 15, windowMs = 60000) {
  const now = Date.now();
  const timestamps = requestLog.get(ip) || [];

  // Filter out timestamps outside the current window
  const activeTimestamps = timestamps.filter((t) => now - t < windowMs);
  activeTimestamps.push(now);
  requestLog.set(ip, activeTimestamps);

  return activeTimestamps.length > limit;
}

/**
 * Validates if a string is a valid UUIDv4.
 *
 * @param {string} uuid - The UUID string to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof uuid === 'string' && uuidRegex.test(uuid);
}

/**
 * Strips HTML tags and script elements from a string to prevent XSS.
 *
 * @param {string} input - The input string to sanitize
 * @returns {string} The sanitized string
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return '';
  }
  return input
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '') // Remove scripts
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .trim();
}

/**
 * Sets basic security headers on a Vercel response object.
 *
 * @param {Object} res - Vercel Serverless response object
 */
function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self';"
  );
  // Restrict CORS to prevent unauthorized origin calls (standard security)
  const allowedOrigins = [process.env.FRONTEND_URL || 'http://localhost:5173'];
  res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'mindflow_secret_key_123';

/**
 * Generates a JSON Web Token for the user payload.
 * @param {Object} payload - User session data
 * @returns {string} Signed JWT
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verifies a JWT token.
 * @param {string} token - Signed JWT
 * @returns {Object|null} Decoded payload or null if invalid
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Extracts and authenticates a user from the request Authorization header.
 * @param {Object} req - Vercel Serverless request object
 * @returns {Object|null} User session payload (id, email) or null
 */
function getAuthUser(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

module.exports = {
  isRateLimited,
  isValidUUID,
  sanitizeInput,
  setSecurityHeaders,
  requestLog,
  generateToken,
  verifyToken,
  getAuthUser,
};
