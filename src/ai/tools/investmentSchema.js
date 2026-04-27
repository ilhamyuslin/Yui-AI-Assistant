/**
 * investmentSchema.js
 * Defines function declarations for investment portfolio queries.
 */

const { getInvestments } = require('../../storage/investmentStore');

const investmentSchema = {
  functionDeclarations: [
    {
      name: "get_investment_portfolio",
      description: "PANGGIL FUNGSI INI jika user bertanya tentang status investasi, portofolio saham/crypto, atau total keuntungan/kerugian investasi.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  ]
};

/**
 * Handler for investment queries.
 */
async function handle(args, ctx) {
  const result = await getInvestments();
  
  if (result.success && result.data) {
    if (result.data.length === 0) {
      return { type: 'DATA', data: "Kamu belum memiliki data investasi yang tercatat." };
    }

    const report = result.data.map(inv => {
      const profit = Number(inv.current_value || inv.purchase_value) - Number(inv.purchase_value);
      const profitPct = ((profit / inv.purchase_value) * 100).toFixed(2);
      const statusEmoji = profit >= 0 ? '📈' : '📉';
      
      return `${statusEmoji} *${inv.name}* (${inv.type})\n   Value: *Rp ${Number(inv.current_value || inv.purchase_value).toLocaleString('id-ID')}*\n   Profit: ${profit >= 0 ? '+' : ''}Rp ${profit.toLocaleString('id-ID')} (${profitPct}%)`;
    }).join('\n\n');

    return {
      type: 'DATA',
      data: `💰 *Portofolio Investasi Anda*:\n\n${report}\n\n*Total Nilai*: Rp ${result.totalPortfolio.toLocaleString('id-ID')}\n*Total Profit/Loss*: Rp ${result.profitOrLoss.toLocaleString('id-ID')}`
    };
  }
  
  return { type: 'ERROR', data: 'Gagal mengambil data investasi.' };
}

module.exports = { investmentSchema, handle };
