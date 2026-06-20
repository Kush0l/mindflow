/**
 * @fileoverview Serverless endpoint for syncing local history with Neon Postgres.
 * Handles GET (fetching history) and POST (backing up data).
 * Secures access using JWT authentication.
 *
 * @author MindFlow Team
 * @version 1.1.0
 */

'use strict';

const { initDb, query } = require('../lib/db');
const { isValidUUID, setSecurityHeaders, isRateLimited, getAuthUser } = require('../../lib/security');

module.exports = async (req, res) => {
  setSecurityHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  if (isRateLimited(ip)) {
    return res.status(429).json({ success: false, message: 'Too many requests. Please slow down.' });
  }

  const hasDb = !!process.env.DATABASE_URL;
  let userId = null;

  // Authentication Flow
  if (hasDb) {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Invalid or missing token.' });
    }
    userId = authUser.id;
  }

  try {
    if (hasDb) {
      await initDb();
    }

    // GET: Retrieve user history
    if (req.method === 'GET') {
      if (!hasDb) {
        // Offline / No-DB Mode
        const { device_id } = req.query;
        if (!isValidUUID(device_id)) {
          return res.status(400).json({ success: false, message: 'Invalid device_id format.' });
        }
        return res.json({ success: true, dbSynced: false, journals: [], chats: [] });
      }

      const journalsRes = await query(
        'SELECT journal_text, mood_score, dominant_emotion, distortions, stressors, response_text, created_at FROM journals WHERE user_id = $1 ORDER BY created_at ASC',
        [userId]
      );
      const chatsRes = await query(
        'SELECT role, content, created_at FROM chats WHERE user_id = $1 ORDER BY created_at ASC',
        [userId]
      );

      return res.json({
        success: true,
        dbSynced: true,
        journals: journalsRes.rows,
        chats: chatsRes.rows,
      });
    }

    // POST: Backup local history
    if (req.method === 'POST') {
      const { device_id, journals = [], chats = [] } = req.body;

      if (!hasDb) {
        if (!isValidUUID(device_id)) {
          return res.status(400).json({ success: false, message: 'Invalid device_id format.' });
        }
        return res.json({ success: true, dbSynced: false });
      }

      // Sync journal records (preventing duplicates)
      for (const j of journals) {
        const existing = await query(
          'SELECT id FROM journals WHERE user_id = $1 AND created_at = $2',
          [userId, j.created_at]
        );
        if (existing.rowCount === 0) {
          await query(
            `INSERT INTO journals (user_id, journal_text, mood_score, dominant_emotion, distortions, stressors, response_text, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              userId,
              j.journal_text,
              j.mood_score,
              j.dominant_emotion,
              JSON.stringify(j.distortions),
              JSON.stringify(j.stressors),
              j.response_text,
              j.created_at || new Date(),
            ]
          );
        }
      }

      // Sync chat records (preventing duplicates)
      for (const c of chats) {
        const existing = await query(
          'SELECT id FROM chats WHERE user_id = $1 AND content = $2 AND created_at = $3',
          [userId, c.content, c.created_at]
        );
        if (existing.rowCount === 0) {
          await query(
            'INSERT INTO chats (user_id, role, content, created_at) VALUES ($1, $2, $3, $4)',
            [userId, c.role, c.content, c.created_at || new Date()]
          );
        }
      }

      return res.json({ success: true, dbSynced: true });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during data sync.',
      error: error.message,
    });
  }
};
