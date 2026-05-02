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
- Hari: ${new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' }).format(now)}
- Tanggal: ${new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(now)}
- Jam: ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' })} WIB
- Zona Waktu: Asia/Jakarta (UTC+7)`;

  const baseInstruction = (currentConfig.system_instruction || 'You are a helpful assistant.') + dateInfo +
    getCapabilitiesInstruction() +
    '\n\nATURAN EKSEKUSI (WAJIB PATUH):' +
    '\n1. JANGAN PERNAH bertanya "Apakah data ini benar?" atau merangkum detail transaksi dalam teks manual jika itu adalah transaksi baru. Segera panggil tool request_record_transaction.' +
    '\n2. Dilarang keras mengirimkan format tanggal ISO dalam teks balasan. Selalu gunakan format manusiawi.' +
    '\n3. Jika memanggil tool query (seperti cek saldo/investasi), jangan bicara terlalu banyak sebelum memanggil tool. Panggil dulu, baru jelaskan hasilnya.' +
    '\n4. Jika data dari database menunjukkan "0" atau "Kosong", sampaikan apa adanya dengan sopan.' +
    '\n5. ATURAN WAJIB LAPORAN: Jika user menanyakan "pengeluaran hari ini", "minggu ini", atau "bulan ini", kamu HARUS memanggil tool `request_financial_summary`. DILARANG KERAS menghitung manual menggunakan data dari riwayat obrolan (chat history) karena riwayat obrolan tidak mencerminkan perhitungan zona waktu yang akurat!' +
    '\n6. ATURAN MANAJEMEN DATA: Jika user ingin menambah, mengedit, atau menghapus Akun (Rekening) atau Anggaran (Budget), kamu HARUS memanggil tool yang sesuai (`request_manage_account`, `request_delete_account`, `request_manage_budget`, atau `request_delete_budget`). DILARANG KERAS berhalusinasi atau mengatakan bahwa kamu sudah melakukannya di database jika kamu tidak memanggil tool tersebut!' +
    '\n7. ATURAN MULTI-DRAFT: Jika user memberikan instruksi revisi atau tambahan saat draf (modal) sedang terbuka, kamu HARUS tetap memanggil tool yang sesuai (tool call) untuk memperbarui draf tersebut. Jangan hanya menjawab dengan teks.' +
    '\n8. MANDATORY TOOL CALL: Setiap kali user memberikan perintah aksi (catat, update, hapus), kamu WAJIB memanggil tool tersebut. Jangan pernah berasumsi draf sudah ada hanya karena ada di riwayat chat sebelumnya. User ingin draf BARU atau draf yang TERUPDATE setiap kali mereka bicara.';

  const model = genAI.getGenerativeModel({
    model: currentConfig.gemini_model || 'gemma-4-26b-a4b-it',
    systemInstruction: baseInstruction,
    tools: [{ functionDeclarations: getGeminiTools(categories) }],
  });

  const chatSession = model.startChat({
    history,
    generationConfig: {
      temperature: 0.2,
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
