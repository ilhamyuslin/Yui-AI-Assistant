/**
 * gemini.js
 * Wrapper for Google Gemini API.
 * Handles multi-turn chat with history context + system instruction.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getGeminiTools, getCapabilitiesInstruction } = require('./tools/registry');

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
    getCapabilitiesInstruction() +
    '\n\nATURAN EKSEKUSI (WAJIB PATUH):' +
    '\n1. JANGAN PERNAH bertanya "Apakah data ini benar?" atau merangkum detail transaksi dalam teks manual jika itu adalah transaksi baru. Segera panggil tool request_record_transaction.' +
    '\n2. Dilarang keras mengirimkan format tanggal ISO dalam teks balasan. Selalu gunakan format manusiawi.' +
    '\n3. Jika memanggil tool query (seperti cek saldo/investasi), jangan bicara terlalu banyak sebelum memanggil tool. Panggil dulu, baru jelaskan hasilnya.' +
    '\n4. Jika data dari database menunjukkan "0" atau "Kosong", sampaikan apa adanya dengan sopan.' +
    '\n5. ATURAN WAJIB LAPORAN: Jika user menanyakan "pengeluaran hari ini", "minggu ini", atau "bulan ini", kamu HARUS memanggil tool `request_financial_summary`. DILARANG KERAS menghitung manual menggunakan data dari riwayat obrolan (chat history) karena riwayat obrolan tidak mencerminkan perhitungan zona waktu yang akurat!';

  const model = genAI.getGenerativeModel({
    model: currentConfig.gemini_model || 'gemini-2.0-flash-exp',
    systemInstruction: baseInstruction,
    tools: [{ functionDeclarations: getGeminiTools(categories) }],
  });

  const chatSession = model.startChat({
    history,
    generationConfig: {
      temperature: 0.5,
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
