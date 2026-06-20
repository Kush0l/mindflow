/**
 * @fileoverview Database adapter for Neon Serverless Postgres.
 * Handles schema initialization and exports a query helper.
 *
 * @author MindFlow Team
 * @version 1.0.0
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
 * Runs DDL scripts for users, journals, and chats.
 * @returns {Promise<void>}
 */
async function initDb() {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured.');
  }

  const createTablesQuery = `
    CREATE TABLE IF NOT EXISTS users (
      device_id UUID PRIMARY KEY,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS journals (
      id SERIAL PRIMARY KEY,
      device_id UUID REFERENCES users(device_id) ON DELETE CASCADE,
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
      device_id UUID REFERENCES users(device_id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await query(createTablesQuery);
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
