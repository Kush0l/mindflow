/**
 * @fileoverview Gemini Generative AI service for MindFlow.
 * Handles open-ended journaling analysis and chatbot companion reasoning.
 *
 * @author MindFlow Team
 * @version 1.0.0
 */

'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const MODEL_NAME = 'gemini-2.5-flash-lite';
const MAX_OUTPUT_TOKENS = 2048;
const TEMPERATURE = 0.5;

/** @type {import('@google/generative-ai').GenerativeModel|null} */
let cachedModel = null;

/**
 * Gets or initializes the Gemini Generative Model instance.
 * Caches the instance as a singleton.
 *
 * @param {string} [mimeType='application/json'] - Desired output mime type
 * @returns {import('@google/generative-ai').GenerativeModel}
 */
function getModel(mimeType = 'application/json') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured');
  }

  // Create a model with specific system instructions
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: TEMPERATURE,
      responseMimeType: mimeType,
    },
    systemInstruction: `You are Aura, an empathetic, supportive, and wise digital companion for students facing extreme stress from competitive entrance exams (e.g. JEE, NEET, UPSC, GATE, CAT).
Your goal is to help them navigate academic pressure, self-doubt, burnout, and anxiety.
You do not give clinical medical advice. If a student mentions self-harm, suicide, or severe clinical symptoms, remain deeply caring, instruct them to seek professional support, and output crisis helpline details.
In journaling analysis, you identify cognitive distortions (like catastrophizing, mind reading, all-or-nothing thinking) and help them reframe their thoughts.`,
  });
}

/**
 * Analyzes a student's daily journal entry.
 * Identifies mood, dominant emotion, cognitive distortions, stressors, and provides reframing.
 *
 * @param {string} journalText - The journal input
 * @param {Array<Object>} [pastEntries=[]] - Optional recent journal entries for context
 * @returns {Promise<Object>} Analyzed data matching the schema
 */
async function analyzeJournal(journalText, pastEntries = []) {
  const model = getModel('application/json');

  let pastContext = '';
  if (pastEntries && pastEntries.length > 0) {
    pastContext = `\nContext: Here are the user's recent past journal reflections to help personalize your analysis:\n`;
    pastEntries.forEach((entry, i) => {
      pastContext += `Past Entry ${i + 1}: "${entry.journal_text}" (Mood: ${entry.mood_score}, Emotion: ${entry.dominant_emotion})\n`;
    });
    pastContext += `\nUse this context to notice patterns (e.g., "I notice you've been feeling anxious about mock tests all week...").`;
  }

  const prompt = `Analyze this student's journal entry. Extract emotional features and cognitive distortions, and provide empathetic reframing and a recommended mindfulness breathing exercise.${pastContext}
  
Student Journal: "${journalText}"

Return a JSON object conforming exactly to this schema:
{
  "moodScore": 1 to 10 (where 1 is extremely stressed/depressed, 10 is joyful/composed),
  "dominantEmotion": "one word representing dominant state, e.g. Overwhelmed, Anxious, Numb, Ashamed, Hopeless, Hopeful, Motivated",
  "distortions": [
    {
      "name": "Catastrophizing | All-or-Nothing | Should Statements | Emotional Reasoning | Mind Reading | Labeling | Personalization",
      "explanation": "A gentle explanation of how they are committing this distortion in their writing",
      "quote": "the exact short phrase from their text that triggered this finding"
    }
  ],
  "stressors": ["academic stressors found, e.g. mock test scores, peer comparison, physics syllabus, lack of sleep"],
  "reframing": "An empathetic, highly personalized response that validates their struggle, counters their distortions, and suggests a healthy perspective change (maximum 3 sentences)",
  "mindfulnessRx": {
    "type": "Panic Relief (4-7-8 Breathing) | Focus Box (4-4-4-4 Box Breathing) | Energizing Breath (4-4 Breath) | Grounding Breath (5-5 Calm)",
    "description": "Why this breathing pattern fits their current emotional state",
    "pace": { "inhale": number_seconds, "hold": number_seconds, "exhale": number_seconds, "holdPost": number_seconds }
  }
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  try {
    return JSON.parse(text);
  } catch (err) {
    // Fallback: extract json block
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) {
      return JSON.parse(match[1]);
    }
    throw new Error('Failed to parse journal analysis as valid JSON');
  }
}

/**
 * Generates an empathetic conversational response for the companion.
 *
 * @param {Array<Object>} history - Chat history array of { role: 'user'|'model', parts: [{ text: '...' }] }
 * @param {string} newMessage - User's incoming chat message
 * @returns {Promise<Object>} JSON containing response and character expression
 */
async function generateChatResponse(history, newMessage) {
  const model = getModel('application/json');

  // Format history for Google AI SDK
  const contents = history.map((h) => ({
    role: h.role,
    parts: [{ text: h.content }],
  }));

  // Append new message
  contents.push({
    role: 'user',
    parts: [{ text: newMessage }],
  });

  const promptExtension = `
Respond to the student's message with deep empathy, encouragement, and practical academic coping tips.
Also, select a facial expression/state for your digital avatar ('calm', 'empathetic', 'encouraging', 'listening', 'thoughtful', 'alert').

Return a JSON object conforming exactly to this schema:
{
  "response": "Your conversational reply to the student",
  "expression": "calm | empathetic | encouraging | listening | thoughtful | alert"
}`;

  // Add the prompt instruction at the end of contents
  contents[contents.length - 1].parts[0].text += `\n\n[Instruction: ${promptExtension}]`;

  const result = await model.generateContent({ contents });
  const text = result.response.text();

  try {
    return JSON.parse(text);
  } catch (err) {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) {
      return JSON.parse(match[1]);
    }
    return {
      response: text.replace(/```json|```/g, '').trim(),
      expression: 'empathetic',
    };
  }
}

module.exports = {
  analyzeJournal,
  generateChatResponse,
  getModel,
};
