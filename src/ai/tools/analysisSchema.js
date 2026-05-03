/**
 * analysisSchema.js
 * Tool declarations for fetching financial data and analysis.
 */

const { getSummaryStats, getTransactionList, getBudgetReport } = require('../../services/transactionService');

const analysisSchema = {
  functionDeclarations: [
    {
      name: "request_financial_summary",
      description: "Ambil ringkasan statistik keuangan (Total Pemasukan, Pengeluaran) dan rincian item pengeluaran spesifik. Jangan gunakan ini untuk mengecek saldo rekening bank spesifik.",
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
      name: "request_account_balances",
      description: "Ambil daftar semua rekening bank / e-wallet beserta saldo saat ini (misalnya BNI, BCA, OVO, Gopay).",
      parameters: {
        type: "object",
        properties: {}
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
    },
    {
      name: "request_transactions_by_date",
      description: "Ambil rincian transaksi untuk tanggal atau rentang tanggal spesifik.",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Tanggal awal (YYYY-MM-DD)."
          },
          endDate: {
            type: "string",
            description: "Tanggal akhir (YYYY-MM-DD). Jika hanya satu hari, samakan dengan startDate."
          }
        },
        required: ["startDate"]
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
    const reportText = await generateFinancialReport({ 
      range: args.range || 'weekly',
      userId: ctx.userId 
    });
    return {
      type: 'FORMATTED_REPORT',
      data: reportText
    };
  } 
  
  if (functionName === 'request_account_balances') {
    const { supabase } = require('../../storage/supabaseClient');
    const { data: accounts } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', ctx.userId); // SECURITY: Only user's accounts
    data = accounts || [];
  }
  else if (functionName === 'request_budget_report') {
    data = await getBudgetReport(args.period || 'monthly', ctx.userId);
  }
  else if (functionName === 'request_recent_transactions') {
    data = await getTransactionList({ 
      limit: args.limit || 5,
      userId: ctx.userId 
    });
  }
  else if (functionName === 'request_transactions_by_date') {
    data = await getTransactionList({ 
      startDate: args.startDate, 
      endDate: args.endDate || args.startDate,
      userId: ctx.userId 
    });
  }

  return {
    type: 'DATA',
    data: data
  };
}

module.exports = { analysisSchema, handle };
