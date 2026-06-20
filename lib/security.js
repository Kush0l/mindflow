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
  // Restrict CORS to prevent unauthorized origin calls (standard security)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = {
  isRateLimited,
  isValidUUID,
  sanitizeInput,
  setSecurityHeaders,
  requestLog,
};
