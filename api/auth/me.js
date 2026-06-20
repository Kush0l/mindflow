/**
 * @fileoverview Serverless endpoint for checking active user session validity.
 *
 * @author MindFlow Team
 * @version 1.0.0
 */

'use strict';

const { setSecurityHeaders, getAuthUser } = require('../../lib/security');

module.exports = async (req, res) => {
  setSecurityHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Invalid or missing token.' });
    }

    return res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Session validation error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};
