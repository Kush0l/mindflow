/**
 * @fileoverview Integration test for API routes.
 * Mocks Gemini responses to test backend logic without network overhead.
 *
 * @author MindFlow Team
 * @version 1.0.0
 */

'use strict';

const { describe, it, mock } = require('node:test');
const assert = require('node:assert');
const analyzeHandler = require('../api/analyze');
const gemini = require('../lib/gemini');

describe('API Integration Tests', () => {
  it('should process journal entry and return analysis successfully', async () => {
    // Mock the Gemini analyzeJournal method
    mock.method(gemini, 'analyzeJournal', async () => {
      return {
        moodScore: 8,
        dominantEmotion: 'Focused',
        distortions: [],
        stressors: ['Mock Tests'],
        reframing: 'You are doing great. Keep it up!',
        mindfulnessRx: {
          type: 'Focus Box (4-4-4-4 Box Breathing)',
          description: 'Great for maintaining focus.',
          pace: { inhale: 4, hold: 4, exhale: 4, holdPost: 4 }
        }
      };
    });

    const req = {
      method: 'POST',
      headers: {
        'x-forwarded-for': '127.0.0.1'
      },
      body: {
        device_id: '123e4567-e89b-42d3-a456-426614174000',
        journal_text: 'I felt really focused today while studying for my mock tests.',
        past_entries: []
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

    await analyzeHandler(req, res);

    // Restore DB env
    process.env.DATABASE_URL = originalDbUrl;

    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(responseData.data.mood_score, 8);
    assert.strictEqual(responseData.data.dominant_emotion, 'Focused');
  });

  it('should reject journal entries that are too long', async () => {
    const req = {
      method: 'POST',
      headers: {
        'x-forwarded-for': '127.0.0.1'
      },
      body: {
        device_id: '123e4567-e89b-42d3-a456-426614174000',
        journal_text: 'A'.repeat(2500)
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

    await analyzeHandler(req, res);

    process.env.DATABASE_URL = originalDbUrl;

    assert.strictEqual(statusCode, 400);
  });
});
