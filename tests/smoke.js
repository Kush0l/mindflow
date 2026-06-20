/**
 * @fileoverview Smoke test to verify Gemini API and Neon Postgres connection.
 * Runs query and analysis validations directly using local .env credentials.
 *
 * @author MindFlow Team
 * @version 1.0.0
 */

'use strict';

const { initDb, query } = require('../lib/db');
const { analyzeJournal } = require('../lib/gemini');
require('dotenv').config();

async function runSmokeTest() {
  console.log('🌌 Starting MindFlow Integration Smoke Test...');
  
  // 1. Verify Gemini API Key
  console.log('\nStep 1: Testing Google Gemini API key...');
  try {
    const sampleJournal = 'I am extremely stressed about my upcoming mock JEE exam. I feel like if I fail this, my whole preparation was for nothing.';
    console.log(`Sending sample journal entry: "${sampleJournal}"`);
    
    const analysis = await analyzeJournal(sampleJournal);
    console.log('✅ Gemini API Response: SUCCESS');
    console.log(`   - Mood Score: ${analysis.moodScore}/10`);
    console.log(`   - Dominant Emotion: ${analysis.dominantEmotion}`);
    console.log(`   - Flagged Distortions: ${analysis.distortions.map(d => d.name).join(', ')}`);
    console.log(`   - Empathetic Reframing: "${analysis.reframing}"`);
  } catch (geminiError) {
    console.error('❌ Gemini API Connection FAILED. Check your GEMINI_API_KEY in .env.');
    console.error(geminiError.message);
  }

  // 2. Verify Neon Postgres Database URL
  console.log('\nStep 2: Testing Neon Postgres database connection...');
  try {
    console.log('Checking database connection & initializing schema tables...');
    await initDb();
    console.log('✅ Neon Postgres: SUCCESS');
    
    // Quick select test
    const testRes = await query("SELECT NOW() as db_time");
    console.log(`   - Database Time: ${testRes.rows[0].db_time}`);
  } catch (dbError) {
    console.error('❌ Neon Postgres Connection FAILED. Check your DATABASE_URL in .env.');
    console.error(dbError.message);
  }

  console.log('\nSmoke test run completed.');
  process.exit(0);
}

runSmokeTest();
