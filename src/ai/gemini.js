/**
 * gemini.js
 * Wrapper for Google Gemini API.
 */
console.log('[GeminiModule] File Loaded');

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getGeminiTools, getCapabilitiesInstruction } = require('./tools/registry');

/**
 * Send a message to Gemini with full conversation history.
 * @param {string} userMessage - The new message from the user.
 * @param {Array} history - Previous conversation turns for context.
 * @param {Array} categories - Optional list of categories for classification.
 * @param {Object} config - The user's specific Gemini configuration.
 * @returns {Promise<{ text: string, tokensUsed: number, functionCalls: Array }>}
 */
async function chat(userMessage, history = [], categories = [], config = {}, accounts = []) {
  if (!config.gemini_api_key) {
    throw new Error('Gemini tidak terkonfigurasi. Harap set API Key di dashboard.');
  }

  const genAI = new GoogleGenerativeAI(config.gemini_api_key);

  const now = new Date();
  const dateInfo = `\n\nKonteks Waktu Sekarang:
- Hari: ${new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' }).format(now)}
- Tanggal: ${new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(now)}
- Jam: ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' })} WIB
- Zona Waktu: Asia/Jakarta (UTC+7)`;

  const accountInfo = accounts.length > 0
    ? `\n\nDaftar Akun/Aset yang dimiliki User: ${accounts.map(a => a.name).join(', ')}`
    : `\n\nUser belum memiliki akun/aset terdaftar.`;

  const userInfo = `\n\nIdentitas User:
- Nama Lengkap: ${config.full_name || 'User'}
- Nama Panggilan: ${config.nickname || 'User'}
\nSelalu gunakan Nama Panggilan saat menyapa atau berbicara dengan user agar terasa lebih akrab.`;

  const baseInstruction = (config.system_instruction || 'You are a helpful assistant.') + dateInfo + accountInfo + userInfo +
    getCapabilitiesInstruction() +
    '\n\nATURAN EKSEKUSI (WAJIB PATUH):' +
    '\n1. JANGAN PERNAH bertanya "Apakah data ini benar?" jika data sudah lengkap. Segera panggil tool yang sesuai.' +
    '\n2. Dilarang keras mengirimkan format tanggal ISO dalam teks balasan. Selalu gunakan format manusiawi.' +
    '\n3. Jika data transaksi TIDAK LENGKAP (misal: nominal atau akun pembayaran belum disebutkan), JANGAN panggil tool. Tanyakan dulu informasinya ke user dengan sopan.' +
    '\n4. Jika memanggil tool query (seperti cek saldo/investasi), jangan bicara terlalu banyak sebelum memanggil tool. Panggil dulu, baru jelaskan hasilnya.' +
    '\n5. ATURAN WAJIB LAPORAN: Jika user menanyakan "pengeluaran hari ini", "minggu ini", atau "bulan ini", kamu HARUS memanggil tool `request_financial_summary`. DILARANG KERAS menghitung manual menggunakan data dari riwayat obrolan (chat history)!' +
    '\n6. ATURAN MANAJEMEN DATA: Jika user ingin menambah, mengedit, atau menghapus Akun atau Anggaran, kamu HARUS memanggil tool yang sesuai. DILARANG KERAS berhalusinasi mengatakan sudah melakukannya tanpa memanggil tool!' +
    '\n7. Panggil tool `request_record_transaction` HANYA JIKA informasi Nama Item, Nominal, dan Akun Pembayaran (Source of Fund) sudah jelas atau disebutkan oleh user.' +
    '\n8. VALIDASI AKUN: Sebelum memanggil tool transaksi atau transfer, kamu HARUS memastikan akun yang disebutkan user (Source of Fund atau Destination) ADA dalam "Daftar Akun/Aset" di atas. Jika TIDAK ADA, JANGAN panggil tool. Beritahu user bahwa akun tersebut belum terdaftar dan tanyakan apakah ingin menggunakan akun lain atau membuat akun baru.' +
    '\n9. SELALU gunakan Nama Panggilan untuk menyapa user, agar terasa lebih akrab.' +
    '\n10. Dalam mencatat catatan transaksi buatlah judul item menjadi 1 kalimat dan sisa detail data selalu masukan ke bagian catatan';

  /**
   * Never Edit this section of setting, only user who can edit this section **/

  const model = genAI.getGenerativeModel({
    model: config.gemini_model || 'gemma-4-26b-a4b-it',
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

module.exports = { chat };
