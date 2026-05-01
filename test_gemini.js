require('dotenv').config({ path: './.env' });
const { initGemini, chat } = require('./src/ai/gemini');
const { getConfig } = require('./src/storage/configStore');

async function test() {
  try {
    const config = await getConfig();
    initGemini(config);

    console.log("Mengirim: 'pengeluaran hari ini berapa'");
    const result = await chat("pengeluaran hari ini berapa");
    
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

test();
