/**
 * @fileoverview Serverless endpoint for the digital companion chatbot.
 * Sanitizes input, requests Gemini conversational response, and logs dialog to Postgres.
 *
 * @author MindFlow Team
 * @version 1.0.0
 */

'use strict';

const { generateChatResponse } = require('../lib/gemini');
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

  const { device_id, message, history = [] } = req.body;

  if (!isValidUUID(device_id)) {
    return res.status(400).json({ success: false, message: 'Invalid device_id format.' });
  }

  const cleanMessage = sanitizeInput(message);
  if (!cleanMessage) {
    return res.status(400).json({ success: false, message: 'Message cannot be empty.' });
  }

  try {
    const chatResult = await generateChatResponse(history, cleanMessage);

    return res.json({
      success: true,
      data: {
        response: chatResult.response,
        expression: chatResult.expression,
        created_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to chat with companion. Please try again.',
      error: error.message,
    });
  }
};
