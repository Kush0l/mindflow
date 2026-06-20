/**
 * @fileoverview Database adapter for Neon Serverless Postgres.
 * Handles schema migration, auth-enabled table creation, and test user seeding.
 *
 * @author MindFlow Team
 * @version 1.1.0
 */

'use strict';

const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');

// Configure WebSockets for Node.js environment
neonConfig.webSocketConstructor = ws;
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('Warning: DATABASE_URL is not set in environment variables.');
}

const pool = new Pool({
  connectionString: databaseUrl,
});

/**
 * Execute a SQL query.
 * @param {string} text - SQL query string
 * @param {Array<*>} [params] - Query parameters
 * @returns {Promise<Object>} Query results
 */
async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Initialize database tables if they do not exist.
 * Rebuilds tables if upgrading from anonymous device schema to auth schema.
 * Seeds a test user account.
 * @returns {Promise<void>}
 */
async function initDb() {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured.');
  }

  // Check if migration from old schema is needed
  try {
    const colCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'email'
    `);
    if (colCheck.rowCount === 0) {
      console.log('Auth Upgrade: Migration required. Rebuilding tables for authentication...');
      await query('DROP TABLE IF EXISTS chats, journals, users CASCADE;');
    }
  } catch (err) {
    // Table 'users' doesn't exist yet, clean slate
  }

  const createTablesQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS journals (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      journal_text TEXT NOT NULL,
      mood_score INTEGER NOT NULL,
      dominant_emotion VARCHAR(50) NOT NULL,
      distortions JSONB NOT NULL,
      stressors JSONB NOT NULL,
      response_text TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chats (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await query(createTablesQuery);
    
    // Seed default test user: student@mindflow.com / Student123!
    const testEmail = 'student@mindflow.com';
    const testUserCheck = await query('SELECT id FROM users WHERE email = $1', [testEmail]);
    
    if (testUserCheck.rowCount === 0) {
      const bcrypt = require('bcryptjs');
      const crypto = require('crypto');
      
      const testId = crypto.randomUUID();
      const testHash = await bcrypt.hash('Student123!', 10);
      
      await query(
        'INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)',
        [testId, testEmail, testHash]
      );
      console.log('Seeded test user successfully (student@mindflow.com / Student123!)');
    }
    
    console.log('Database tables verified/initialized successfully.');
  } catch (error) {
    console.error('Error initializing database tables:', error);
    throw error;
  }
}

module.exports = {
  query,
  initDb,
  pool,
};
