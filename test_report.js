require('dotenv').config({ path: './.env' });
const { generateFinancialReport } = require('./src/services/transactionService');

async function test() {
  try {
    const report = await generateFinancialReport({ range: 'daily' });
    console.log("=== OUTPUT DARI FUNGSI BACKEND ===");
    console.log(report);
  } catch (err) {
    console.error(err);
  }
}

test();
