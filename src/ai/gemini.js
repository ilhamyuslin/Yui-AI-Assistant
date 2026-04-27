/**
 * gemini.js
 * Wrapper for Google Gemini API.
 * Handles multi-turn chat with history context + system instruction.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getExpenseSchema } = require('./tools/expenseSchema');

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
 * @param {Array} categories - Optional list of categories for classification.
 * @returns {Promise<{ text: string, tokensUsed: number, functionCalls: Array }>}
 */
async function chat(userMessage, history = [], categories = []) {
  if (!genAI) throw new Error('Gemini tidak terkonfigurasi. Harap set API Key di dashboard.');

  const now = new Date();
  const dateInfo = `\n\nKonteks Waktu Sekarang:
- Hari: ${new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(now)}
- Tanggal: ${new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(now)}
- Jam: ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })} WIB
- Zona Waktu: Asia/Jakarta (UTC+7)`;

  const baseInstruction = (currentConfig.system_instruction || 'You are a helpful assistant.') + dateInfo + 
    '\n\nATURAN EKSEKUSI (WAJIB PATUH):' +
    '\n1. JANGAN PERNAH bertanya "Apakah data ini benar?" atau merangkum detail transaksi dalam teks manual. Segera panggil tool request_record_transaction karena konfirmasi akan dilakukan melalui tombol sistem.' +
    '\n2. Dilarang keras mengirimkan format tanggal ISO (seperti T17:55...) dalam teks balasan. Selalu gunakan format manusiawi: "Senin, 27 April".' +
    '\n3. Jika user memberikan data transaksi, tugas utamamu adalah MENGISI PARAMETER TOOL dan MANGGILNYA. Bicara secukupnya saja (contoh: "Oke sayang, aku siapkan konfirmasinya ya!").' +
    '\n4. Tool request_record_transaction adalah SATU-SATUNYA cara untuk mencatat data. Jangan berlagak seolah sudah mencatat jika belum memanggil tool.';

  const model = genAI.getGenerativeModel({
    model: currentConfig.gemini_model || 'gemini-2.0-flash-exp',
    systemInstruction: baseInstruction,
    tools: [getExpenseSchema(categories)],
  });

  const chatSession = model.startChat({
    history,
    generationConfig: {
      temperature: 0.9,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
      thinkingConfig: {
        includeThoughts: false,
        thinkingLevel: "MINIMAL"
      }
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
