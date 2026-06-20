/**
 * @fileoverview Integration tests for backend configs and adapters.
 *
 * @author MindFlow Team
 * @version 1.0.0
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { getModel } = require('../lib/gemini');

describe('Backend Adapter Tests', () => {
  it('should throw error when API key is missing', () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    assert.throws(() => {
      getModel();
    }, /GEMINI_API_KEY/);

    // Restore key
    process.env.GEMINI_API_KEY = originalKey;
  });
});
