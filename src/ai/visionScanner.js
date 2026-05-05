/**
 * visionScanner.js
 * Specialized module for multimodal image scanning using Gemma 4.
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Scans a receipt image and extracts transaction data.
 * @param {string} base64Image - The image data in Base64 format.
 * @param {string} userPrompt - Optional additional context from the user.
 * @param {Object} config - Configuration containing API key and model.
 * @param {Array} categories - Available categories for matching.
 * @returns {Promise<Object>} - Structured transaction data.
 */
async function scanReceipt(base64Image, userPrompt = '', config = {}, categories = []) {
  if (!config.gemini_api_key) {
    throw new Error('Gemini API Key tidak ditemukan. Harap atur di konfigurasi.');
  }

  const genAI = new GoogleGenerativeAI(config.gemini_api_key);
  const modelName = config.gemini_model || 'gemma-4-26b-a4b-it';
  const model = genAI.getGenerativeModel({ model: modelName });

  const categoryList = categories.length > 0 ? categories.join(', ') : "Lainnya";
  const today = new Date().toISOString().split('T')[0];

  const systemPrompt = `
    Kamu adalah asisten keuangan ahli OCR. Tugas kamu adalah mengekstrak data transaksi dari gambar struk/nota yang diberikan.
    Kembalikan data HANYA dalam format JSON murni. Jangan berikan teks penjelasan apapun di luar JSON.

    Daftar Kategori yang Tersedia: [${categoryList}]

    Aturan Ekstraksi:
    1. transaction_type: Selalu "Expense" karena ini adalah struk belanja/pembayaran.
    2. amount: Ambil TOTAL nominal yang dibayarkan (angka saja).
    3. item_name: Ringkasan singkat belanjaan (misal: "Alfamart", "Pertamina", "Makan Siang").
    4. category: Pilih satu yang paling cocok dari daftar di atas. Jika tidak ada yang pas, pilih "Lainnya".
    5. source_of_fund: Deteksi metode bayar (misal: "BCA", "Cash", "OVO"). Jika tidak terbaca, gunakan "Cash".
    6. transaction_notes: Detail barang yang dibeli jika terlihat, ringkas saja.
    7. transaction_date: Tanggal di struk format YYYY-MM-DD. Jika tidak ditemukan, gunakan "${today}".
    8. is_valid_receipt: Set true jika ini adalah struk/nota/bukti bayar. Set false jika ini gambar lain (foto orang, pemandangan, dll).

    Format JSON yang diharapkan:
    {
      "transaction_type": "Expense",
      "amount": 50000,
      "item_name": "...",
      "category": "...",
      "source_of_fund": "...",
      "transaction_notes": "...",
      "transaction_date": "YYYY-MM-DD",
      "is_valid_receipt": true
    }

    Prompt tambahan dari user: "${userPrompt}"
  `;

  // Detect MIME type from base64 string
  const mimeTypeMatch = base64Image.match(/data:([^;]+);/);
  const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
  const base64Data = base64Image.split(',')[1] || base64Image;

  const inlineData = {
    inlineData: {
      data: base64Data,
      mimeType: mimeType
    }
  };

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [ { text: systemPrompt }, inlineData ] }],
      generationConfig: {
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
        thinkingConfig: {
          includeThoughts: false,
          thinkingLevel: "MINIMAL"
        }
      }
    });
    const response = await result.response;
    let text = response.text();
    
    // Aggressive JSON extraction: Find the first '{' and last '}'
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[VisionScanner] No JSON found in response:', text);
      throw new Error('AI tidak memberikan data transaksi yang valid.');
    }

    const cleanJson = jsonMatch[0];
    
    try {
      const data = JSON.parse(cleanJson);
      return data;
    } catch (parseError) {
      console.error('[VisionScanner] JSON Parse Error. Raw:', cleanJson);
      throw new Error('Gagal memproses format data transaksi.');
    }
  } catch (error) {
    console.error('[VisionScanner] Error:', error);
    throw new Error('Gagal mengekstrak data dari gambar. Pastikan gambar jelas dan merupakan struk pembayaran.');
  }
}

module.exports = { scanReceipt };
