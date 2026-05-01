require('dotenv').config({ path: './.env' });
const { initGemini, chat } = require('./src/ai/gemini');
const { getConfig } = require('./src/storage/configStore');
const { handle } = require('./src/ai/tools/analysisSchema');

async function testBalance() {
  try {
    const config = await getConfig();
    initGemini(config);

    const message = "saldo bni aku berapa";
    console.log("User:", message);
    
    // Tahap 1: AI menganalisa pertanyaan
    const aiResponse = await chat(message);
    
    if (aiResponse.functionCalls && aiResponse.functionCalls.length > 0) {
      const call = aiResponse.functionCalls[0];
      console.log(`[Tahap 1] AI memanggil: ${call.name}`);
      
      // Tahap 2: Eksekusi Tool (Simulasi chatRoutes)
      const result = await handle(call.args, { userId: 'test' }, call.name);
      
      if (result.type === 'DATA') {
        console.log("[Tahap 2] Tool menghasilkan DATA mentah. Mengembalikan ke AI...");
        const extendedHistory = [
          { role: 'user', parts: [{ text: message }] },
          { role: 'model', parts: [{ functionCall: { name: call.name, args: call.args } }] },
          { role: 'function', parts: [{ functionResponse: { name: call.name, response: { data: result.data } } }] }
        ];
        
        // Tahap 3: AI merangkum data
        const finalResponse = await chat("Tolong rangkum hasil data di atas sesuai pertanyaanku sebelumnya secara natural dan singkat.", extendedHistory);
        console.log("[Tahap 3] Jawaban Akhir AI:", finalResponse.text);
      } else {
        console.log("[Tahap 2] Tool menghasilkan FORMATTED_REPORT (Tidak dirangkum ulang):");
        console.log(result.data);
      }
    } else {
      console.log("AI tidak memanggil tool:", aiResponse.text);
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testBalance();
