/**
 * @fileoverview Integration test for Chat API route.
 * Mocks Gemini responses to test backend logic without network overhead.
 *
 * @author MindFlow Team
 * @version 1.0.0
 */

'use strict';

const { describe, it, mock } = require('node:test');
const assert = require('node:assert');
const chatHandler = require('../api/chat');
const gemini = require('../lib/gemini');

describe('Chat API Integration Tests', () => {
  it('should process chat message and return response successfully', async () => {
    // Mock the Gemini generateChatResponse method
    mock.method(gemini, 'generateChatResponse', async () => {
      return {
        response: 'I am here for you. Deep breaths.',
        expression: 'empathetic'
      };
    });

    const req = {
      method: 'POST',
      headers: {
        'x-forwarded-for': '127.0.0.1'
      },
      body: {
        device_id: '123e4567-e89b-42d3-a456-426614174000',
        message: 'I am so stressed right now.',
        history: []
      }
    };

    let responseData = null;
    let statusCode = 200;

    const res = {
      setHeader: () => {},
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (data) => {
        responseData = data;
        return res;
      }
    };

    // Temporarily bypass DB check for test
    const originalDbUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    await chatHandler(req, res);

    // Restore DB env
    process.env.DATABASE_URL = originalDbUrl;

    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(responseData.data.response, 'I am here for you. Deep breaths.');
    assert.strictEqual(responseData.data.expression, 'empathetic');
  });

  it('should reject chat messages that are too long', async () => {
    const req = {
      method: 'POST',
      headers: {
        'x-forwarded-for': '127.0.0.1'
      },
      body: {
        device_id: '123e4567-e89b-42d3-a456-426614174000',
        message: 'A'.repeat(2500)
      }
    };

    let statusCode = 200;
    const res = {
      setHeader: () => {},
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: () => { return res; }
    };

    // Temporarily bypass DB check for test
    const originalDbUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    await chatHandler(req, res);

    process.env.DATABASE_URL = originalDbUrl;

    assert.strictEqual(statusCode, 400);
  });
});
