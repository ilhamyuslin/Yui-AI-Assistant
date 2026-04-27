/**
 * budgetSchema.js
 * Defines function declarations for budget tracking with improved descriptions.
 */

const { getBudgets } = require('../../storage/budgetStore');

const budgetSchema = {
  functionDeclarations: [
    {
      name: "get_budget_status",
      description: "Gunakan fungsi ini untuk mengecek status budget. Bisa untuk SEMUA kategori sekaligus (biarkan category kosong) atau per kategori spesifik. Fungsi ini otomatis menghitung berdasarkan siklus gajian user.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Nama kategori spesifik (opsional). Jika dikosongkan, akan menampilkan ringkasan SEMUA budget yang ada."
          }
        }
      }
    }
  ]
};

/**
 * Handler for budget queries.
 */
async function handle(args, ctx) {
  // Let budgetStore handle the cycle calculation automatically
  const result = await getBudgets();
  
  if (result.success && result.data) {
    let budgets = result.data;
    const periodStr = `${budgets[0]?.period_start} s/d ${budgets[0]?.period_end}`;
    
    // Filter by category if requested
    if (args.category) {
      budgets = budgets.filter(b => 
        b.category_name.toLowerCase().includes(args.category.toLowerCase())
      );
    }

    if (budgets.length === 0) {
      return { 
        type: 'DATA', 
        data: args.category 
          ? `Budget untuk kategori "${args.category}" tidak ditemukan atau belum diatur.` 
          : "Belum ada budget yang diatur untuk siklus ini." 
      };
    }

    const report = budgets.map(b => {
      const limit = Number(b.budget_limit || 0);
      const spent = Number(b.actual_expense || 0);
      const remaining = Number(b.remaining_budget || 0);
      const percent = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      
      let status = '✅';
      if (percent >= 100) status = '❌ (Over)';
      else if (percent >= 80) status = '⚠️ (Kritis)';

      return `${status} *${b.category_name}*\n   Sisa: *Rp ${remaining.toLocaleString('id-ID')}*\n   Terpakai: Rp ${spent.toLocaleString('id-ID')} / Rp ${limit.toLocaleString('id-ID')} (${percent}%)`;
    }).join('\n\n');

    const header = args.category 
      ? `📊 *Status Budget: ${args.category}*` 
      : `📊 *Ringkasan Semua Budget*`;

    return {
      type: 'DATA',
      data: `${header}\n📅 Periode: ${periodStr}\n\n${report}`
    };
  }
  
  return { type: 'ERROR', data: 'Gagal mengambil data budget.' };
}

module.exports = { budgetSchema, handle };
