/**
 * transactionService.js
 * Central business logic for financial data.
 * Used by both REST API and AI Assistant tools.
 */

const { supabase } = require('../storage/supabaseClient');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Jakarta');

/**
 * Common date range calculator.
 */
function calculateDateRange(range, customStart, customEnd) {
  let start = customStart;
  let end = customEnd;

  if (range === 'daily') {
    start = dayjs().tz().startOf('day').toISOString();
    end = dayjs().tz().endOf('day').toISOString();
  } else if (range === 'weekly') {
    start = dayjs().tz().subtract(6, 'day').startOf('day').toISOString();
    end = dayjs().tz().endOf('day').toISOString();
  } else if (range === 'monthly') {
    start = dayjs().tz().subtract(29, 'day').startOf('day').toISOString();
    end = dayjs().tz().endOf('day').toISOString();
  }
  
  return { start, end };
}

/**
 * Fetch aggregated statistics like total income, expense, and category breakdown.
 */
async function getSummaryStats({ range, startDate, endDate }) {
  const { start, end } = calculateDateRange(range, startDate, endDate);

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('transaction_date', start || dayjs().startOf('month').toISOString())
    .lte('transaction_date', end || dayjs().endOf('month').toISOString());

  if (error) throw error;

  const stats = {
    total_income: 0,
    total_expense: 0,
    net_savings: 0,
    categories: {},
    sources: {},
    daily_trend: {}
  };

  // Group by date for trend
  transactions.forEach(tx => {
    const amt = parseFloat(tx.amount || 0);
    const dateStr = dayjs(tx.transaction_date).format('YYYY-MM-DD');

    if (tx.transaction_type === 'Income') {
      stats.total_income += amt;
    } else if (tx.transaction_type === 'Expense') {
      stats.total_expense += amt;
      stats.categories[tx.category] = (stats.categories[tx.category] || 0) + amt;
    }

    stats.sources[tx.source_of_fund] = (stats.sources[tx.source_of_fund] || 0) + amt;
  });

  stats.net_savings = stats.total_income - stats.total_expense;

  // Add recent transaction details so the AI knows EXACTLY what items are being summarized
  stats.recent_details = transactions.map(tx => ({
    item: tx.item_name,
    amount: tx.amount,
    category: tx.category,
    type: tx.transaction_type
  })).slice(0, 15); // Limit to top 15 items for context

  return stats;
}

/**
 * Fetch a list of individual transactions.
 */
async function getTransactionList({ range, startDate, endDate, transaction_type, limit = 50 }) {
  const { start, end } = calculateDateRange(range, startDate, endDate);

  let query = supabase
    .from('transactions')
    .select('*')
    .order('transaction_date', { ascending: false })
    .limit(limit);

  if (start) query = query.gte('transaction_date', start);
  if (end) query = query.lte('transaction_date', end);
  if (transaction_type) query = query.eq('transaction_type', transaction_type);

  const { data, error } = await query;
  if (error) throw error;

  return data;
}

/**
 * Fetch budget status vs actual spending.
 */
async function getBudgetReport(period) {
  const targetPeriod = period || dayjs().format('YYYY-MM');
  const startOfMonth = dayjs(targetPeriod).startOf('month').toISOString();
  const endOfMonth = dayjs(targetPeriod).endOf('month').toISOString();

  // 1. Get budgets
  const { data: budgetLimits, error: budgetError } = await supabase
    .from('budgets')
    .select('*');

  if (budgetError) throw budgetError;

  // 2. Get spending
  const { data: actuals, error: actualError } = await supabase
    .from('transactions')
    .select('category, amount')
    .eq('transaction_type', 'Expense')
    .gte('transaction_date', startOfMonth)
    .lte('transaction_date', endOfMonth);

  if (actualError) throw actualError;

  // Aggregate
  const actualMap = {};
  actuals.forEach(tx => {
    actualMap[tx.category] = (actualMap[tx.category] || 0) + parseFloat(tx.amount);
  });

  return budgetLimits.map(b => ({
    category: b.category,
    limit: b.amount,
    actual: actualMap[b.category] || 0,
    remaining: b.amount - (actualMap[b.category] || 0)
  }));
}

/**
 * Generate a pre-formatted financial report for the AI to display.
 * This prevents AI from hallucinating numbers by doing calculations in JS/SQL instead.
 */
async function generateFinancialReport({ range = 'weekly' }) {
  const { start, end } = calculateDateRange(range);
  
  // Use a more robust query for categories to match dashboard perfectly
  const { data: stats, error } = await supabase
    .from('transactions')
    .select('amount, category, item_name')
    .eq('transaction_type', 'Expense')
    .gte('transaction_date', start)
    .lte('transaction_date', end);

  if (error) throw error;

  if (!stats || stats.length === 0) {
    return `Tidak ada catatan pengeluaran untuk periode ${range} ini. 😊`;
  }

  let total = 0;
  const categories = {};
  const topItems = stats.slice(0, 10);

  stats.forEach(s => {
    const amt = Number(s.amount);
    total += amt;
    categories[s.category] = (categories[s.category] || 0) + amt;
  });

  // Build the fixed report string
  let report = `📊 *LAPORAN PENGELUARAN (${range.toUpperCase()})*\n`;
  report += `📅 Periode: ${dayjs(start).format('DD MMM')} - ${dayjs(end).format('DD MMM')}\n\n`;
  report += `💰 *Total Pengeluaran: Rp ${total.toLocaleString('id-ID')}*\n\n`;
  
  report += `🗂 *Rincian per Kategori:*\n`;
  Object.entries(categories)
    .sort(([, a], [, b]) => b - a)
    .forEach(([cat, val]) => {
      report += `- ${cat}: Rp ${val.toLocaleString('id-ID')}\n`;
    });

  if (topItems.length > 0) {
    report += `\n📝 *Daftar Transaksi:*\n`;
    topItems.forEach(item => {
      report += `- ${item.item_name} (Rp ${Number(item.amount).toLocaleString('id-ID')})\n`;
    });
  }

  return report;
}

module.exports = { 
  getTransactionList, 
  getSummaryStats, 
  getBudgetReport,
  generateFinancialReport 
};
