/**
 * analysisSchema.js
 * Tool declarations for fetching financial data and analysis.
 */

const { getSummaryStats, getTransactionList, getBudgetReport } = require('../../services/transactionService');

const analysisSchema = {
  functionDeclarations: [
    {
      name: "request_financial_summary",
      description: "Ambil ringkasan statistik keuangan (Total Pemasukan, Pengeluaran, Saldo) dan rincian item pengeluaran spesifik sebagai referensi. Gunakan rincian item ini untuk menjelaskan kategori 'Lainnya' atau 'Umum' agar akurat.",
      parameters: {
        type: "object",
        properties: {
          range: {
            type: "string",
            enum: ["daily", "weekly", "monthly"],
            description: "Rentang waktu: 'daily' (hari ini), 'weekly' (7 hari terakhir), 'monthly' (30 hari terakhir)."
          }
        }
      }
    },
    {
      name: "request_recent_transactions",
      description: "Ambil daftar rincian transaksi terakhir.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Jumlah transaksi yang ingin ditampilkan (default 5)."
          }
        }
      }
    },
    {
      name: "request_budget_report",
      description: "Ambil laporan sisa budget per kategori untuk bulan ini.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            description: "Periode bulan dalam format YYYY-MM (opsional, default bulan ini)."
          }
        }
      }
    }
  ]
};

/**
 * Handler for mapping tools to stats retrieval.
 */
async function handle(args, ctx, functionName) {
  const { 
    getSummaryStats, 
    generateFinancialReport,
    getBudgetReport 
  } = require('../../services/transactionService');

  let data = null;
  
  if (functionName === 'request_financial_summary') {
    // RETURN HARDCODED FORMATTED REPORT TO PREVENT HALLUCINATION
    const reportText = await generateFinancialReport({ range: args.range || 'weekly' });
    return {
      type: 'DATA',
      data: reportText
    };
  } 
  
  if (functionName === 'request_budget_report') {
    data = await getBudgetReport(args.period || 'monthly');
  }
  else if (functionName === 'request_recent_transactions') {
    data = await getTransactionList({ limit: args.limit || 5 });
  }

  return {
    type: 'DATA',
    data: data
  };
}

module.exports = { analysisSchema, handle };
