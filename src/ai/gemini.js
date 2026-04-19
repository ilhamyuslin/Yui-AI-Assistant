/**
 * gemini.js
 * Wrapper for Google Gemini API.
 * Handles multi-turn chat with history context + system instruction.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { expenseSchema } = require('./tools/expenseSchema');

let genAI = null;
let currentModel = null;
let currentConfig = {};

/**
 * Initialize or re-initialize Gemini with latest config.
 */
function initGemini(config) {
  if (!config.gemini_api_key) {
    console.warn('[Gemini] No API key set. AI will not respond.');
    genAI = null;
    return;
  }

  genAI = new GoogleGenerativeAI(config.gemini_api_key);
  currentConfig = config;

  console.log(`[Gemini] Initialized with model: ${config.gemini_model}`);
}

/**
 * Send a message to Gemini with full conversation history.
 * @param {string} userMessage - The new message from the user.
 * @param {Array} history - Previous conversation turns for context.
 * @returns {Promise<{ text: string, tokensUsed: number }>}
 */
async function chat(userMessage, history = []) {
  if (!genAI) throw new Error('Gemini tidak terkonfigurasi. Harap set API Key di dashboard.');

  const model = genAI.getGenerativeModel({
    model: currentConfig.gemini_model || 'gemini-3.1-flash-lite-preview',
    systemInstruction: currentConfig.system_instruction || 'You are a helpful assistant.',
    tools: [expenseSchema],
  });

  const chatSession = model.startChat({
    history,
    generationConfig: {
      temperature: 0.9,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  });

  const result = await chatSession.sendMessage(userMessage);
  const response = result.response;
  const text = response.text();
  const tokensUsed = response.usageMetadata?.totalTokenCount || 0;
  const functionCalls = response.functionCalls();

  return { text, tokensUsed, functionCalls };
}

/**
 * Check if Gemini is currently configured and ready.
 */
function isReady() {
  return genAI !== null;
}

module.exports = { initGemini, chat, isReady };
