/**
 * @fileoverview Unit tests for security sanitization and validation.
 * Uses Node's built-in test runner.
 *
 * @author MindFlow Team
 * @version 1.0.0
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { isValidUUID, sanitizeInput, isRateLimited, requestLog } = require('../lib/security');

describe('Security Helper Tests', () => {
  it('should validate correct UUIDv4', () => {
    // Correct UUIDv4
    assert.strictEqual(isValidUUID('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'), true);
    // Incorrect UUID formats
    assert.strictEqual(isValidUUID('6e8bc430-9c3a-11d9-9669-0800200c9a66'), false);
    assert.strictEqual(isValidUUID('invalid-uuid'), false);
    assert.strictEqual(isValidUUID(12345), false);
  });

  it('should sanitize HTML and script tags', () => {
    const dirty = '<script>alert("xss")</script>Hello <b>World</b><iframe src="test"></iframe>!';
    const clean = sanitizeInput(dirty);
    assert.strictEqual(clean, 'Hello World!');
  });

  it('should limit request rate after threshold is crossed', () => {
    const ip = '192.168.1.99';
    requestLog.set(ip, []); // Reset for testing

    // Under threshold (limit = 3)
    assert.strictEqual(isRateLimited(ip, 3), false);
    assert.strictEqual(isRateLimited(ip, 3), false);
    assert.strictEqual(isRateLimited(ip, 3), false);

    // Exceeds threshold
    assert.strictEqual(isRateLimited(ip, 3), true);
  });
});
