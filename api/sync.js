/**
 * @fileoverview Serverless endpoint for syncing local history with Neon Postgres.
 * Handles GET (fetching history) and POST (backing up data).
 *
 * @author MindFlow Team
 * @version 1.0.0
 */

'use strict';

const { initDb, query } = require('../lib/db');
const { isValidUUID, setSecurityHeaders, isRateLimited } = require('../lib/security');

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

  try {
    if (hasDb) {
      await initDb();
    }

    // GET: Retrieve user history
    if (req.method === 'GET') {
      const { device_id } = req.query;

      if (!isValidUUID(device_id)) {
        return res.status(400).json({ success: false, message: 'Invalid device_id format.' });
      }

      if (!hasDb) {
        return res.json({ success: true, dbSynced: false, journals: [], chats: [] });
      }

      const journalsRes = await query(
        'SELECT journal_text, mood_score, dominant_emotion, distortions, stressors, response_text, created_at FROM journals WHERE device_id = $1 ORDER BY created_at ASC',
        [device_id]
      );
      const chatsRes = await query(
        'SELECT role, content, created_at FROM chats WHERE device_id = $1 ORDER BY created_at ASC',
        [device_id]
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

      if (!isValidUUID(device_id)) {
        return res.status(400).json({ success: false, message: 'Invalid device_id format.' });
      }

      if (!hasDb) {
        return res.json({ success: true, dbSynced: false });
      }

      // Ensure user session exists
      await query(
        'INSERT INTO users (device_id) VALUES ($1) ON CONFLICT (device_id) DO NOTHING',
        [device_id]
      );

      // Sync journal records (preventing duplicates)
      for (const j of journals) {
        const existing = await query(
          'SELECT id FROM journals WHERE device_id = $1 AND created_at = $2',
          [device_id, j.created_at]
        );
        if (existing.rowCount === 0) {
          await query(
            `INSERT INTO journals (device_id, journal_text, mood_score, dominant_emotion, distortions, stressors, response_text, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              device_id,
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
          'SELECT id FROM chats WHERE device_id = $1 AND content = $2 AND created_at = $3',
          [device_id, c.content, c.created_at]
        );
        if (existing.rowCount === 0) {
          await query(
            'INSERT INTO chats (device_id, role, content, created_at) VALUES ($1, $2, $3, $4)',
            [device_id, c.role, c.content, c.created_at || new Date()]
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
