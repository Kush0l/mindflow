/**
 * @fileoverview Serverless endpoint for analyzing student journal entries.
 * Sanitizes input, triggers Gemini cognitive distortion parsing, and logs the result to Postgres.
 *
 * @author MindFlow Team
 * @version 1.0.0
 */

'use strict';

const { analyzeJournal } = require('../lib/gemini');
const { initDb, query } = require('../lib/db');
const { isValidUUID, sanitizeInput, setSecurityHeaders, isRateLimited } = require('../lib/security');

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

  const { device_id, journal_text } = req.body;

  if (!isValidUUID(device_id)) {
    return res.status(400).json({ success: false, message: 'Invalid device_id format.' });
  }

  const cleanJournalText = sanitizeInput(journal_text);
  if (!cleanJournalText || cleanJournalText.length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Journal entry must be at least 10 characters long.',
    });
  }

  try {
    const analysis = await analyzeJournal(cleanJournalText);

    return res.json({
      success: true,
      data: {
        journal_text: cleanJournalText,
        mood_score: analysis.moodScore,
        dominant_emotion: analysis.dominantEmotion,
        distortions: analysis.distortions,
        stressors: analysis.stressors,
        response_text: analysis.reframing,
        mindfulnessRx: analysis.mindfulnessRx,
        created_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Journal analysis API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to analyze journal. Please try again.',
      error: error.message,
    });
  }
};
