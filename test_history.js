require('dotenv').config({ path: './.env' });
const { initGemini, chat } = require('./src/ai/gemini');
const { getConfig } = require('./src/storage/configStore');

async function testWithHistory() {
  try {
    const config = await getConfig();
    initGemini(config);

    const history = [
      {
        role: "user",
        parts: [{ text: "Catat pengeluaran nasi padang 22.000" }]
      },
      {
        role: "model",
        parts: [{ text: "Nasi padang berhasil dicatat." }]
      },
      {
        role: "user",
        parts: [{ text: "Catat pengeluaran kwetiau 15.000" }]
      },
      {
        role: "model",
        parts: [{ text: "Kwetiau berhasil dicatat." }]
      }
    ];

    console.log("Mengirim: 'pengeluaran hari ini berapa' (DENGAN RIWAYAT PALSU)");
    const result = await chat("pengeluaran hari ini berapa", history);
    
    console.log("=== HASIL CHAT ===");
    if (result.functionCalls && result.functionCalls.length > 0) {
      console.log("AI memanggil tool:", result.functionCalls.map(c => c.name));
      console.log("Dengan argumen:", result.functionCalls[0].args);
    } else {
      console.log("AI TIDAK MEMANGGIL TOOL! Balasan teks murni:");
      console.log(result.text);
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testWithHistory();
