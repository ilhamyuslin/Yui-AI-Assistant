/**
 * summarySchema.js
 * Defines function declarations for financial statistics and history.
 */

const { getFinancialSummary, getRecentTransactions } = require('../../storage/summaryStore');

const summarySchema = {
  functionDeclarations: [
    {
      name: "get_financial_stats",
      description: "PANGGIL FUNGSI INI jika user bertanya tentang ringkasan keuangan, total pengeluaran/pemasukan bulanan, atau kategori pengeluaran terbesar.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["this_month", "last_month", "this_week"],
            description: "Periode statistik yang diminta."
          }
        }
      }
    },
    {
      name: "get_recent_transactions",
      description: "PANGGIL FUNGSI INI jika user ingin melihat daftar pengeluaran terakhir, riwayat transaksi, atau mencari transaksi di kategori tertentu.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Jumlah transaksi yang ditampilkan (default 10)." },
          transaction_type: { type: "string", enum: ["Expense", "Income", "Transfer"], description: "Filter berdasarkan tipe transaksi." },
          category: { type: "string", description: "Filter berdasarkan nama kategori." },
          start_date: { type: "string", description: "Format YYYY-MM-DD" },
          end_date: { type: "string", description: "Format YYYY-MM-DD" }
        }
      }
    }
  ]
};

/**
 * Handler dispatcher for summary tools.
 */
async function handle(args, ctx, functionName) {
  const now = new Date();
  
  if (functionName === 'get_financial_stats') {
    let start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    let end = new Date().toISOString().split('T')[0];
    let title = "Bulan Ini";

    if (args.period === 'this_week') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      start = weekAgo.toISOString().split('T')[0];
      title = "7 Hari Terakhir";
    }

    const result = await getFinancialSummary(start, end);
    if (result.success) {
      const s = result.data;
      const top3 = s.top_categories.slice(0, 3).map((c, i) => `${i+1}. ${c.name}: *Rp ${c.total.toLocaleString('id-ID')}*`).join('\n');
      
      return {
        type: 'DATA',
        data: `📊 *Statistik Keuangan (${title})*\n\n` +
              `🟢 Pemasukan: *Rp ${Number(s.total_income || 0).toLocaleString('id-ID')}*\n` +
              `🔴 Pengeluaran: *Rp ${Number(s.total_expense || 0).toLocaleString('id-ID')}*\n` +
              `💰 Tabungan: *Rp ${Number(s.total_savings || 0).toLocaleString('id-ID')}*\n\n` +
              `🔝 *Top 3 Pengeluaran*:\n${top3 || 'Belum ada data'}`
      };
    }
  }

  if (functionName === 'get_recent_transactions') {
    const result = await getRecentTransactions(args);
    if (result.success) {
      if (result.data.length === 0) return { type: 'DATA', data: "Tidak ada transaksi yang ditemukan untuk kriteria tersebut." };
      
      const list = result.data.map(tx => {
        const sign = tx.transaction_type === 'Income' ? '🟢' : '🔴';
        return `${sign} *${tx.item_name}*\n   Rp ${Number(tx.amount).toLocaleString('id-ID')} (${tx.category}) - ${tx.transaction_date}`;
      }).join('\n\n');

      let header = `📝 *Daftar Transaksi Terakhir*`;
      if (args.transaction_type) header = `📝 *Daftar ${args.transaction_type} Anda*`;
      if (args.category) header += ` (Kategori: ${args.category})`;

      return { type: 'DATA', data: `${header}:\n\n${list}` };
    }
  }

  return { type: 'ERROR', data: 'Gagal memproses data statistik.' };
}

module.exports = { summarySchema, handle };
