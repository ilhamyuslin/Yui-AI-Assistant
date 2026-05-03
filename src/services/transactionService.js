/**
 * transactionService.js
 * Central business logic for financial data.
 * Used by both REST API and AI Assistant tools.
 */

const { supabase } = require('../storage/supabaseClient');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const isoWeek = require('dayjs/plugin/isoWeek');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);
dayjs.tz.setDefault('Asia/Jakarta');

const { STANDARD_CATEGORIES } = require('../constants/categories');

/**
 * Helper to get the actual payday adjusted for weekends (last working day)
 */
function getActualPayday(date, payDay) {
  let d = date.date(payDay);
  if (d.date() !== payDay && payDay > 28) d = date.endOf('month');
  const dayOfWeek = d.day();
  if (dayOfWeek === 6) return d.subtract(1, 'day');
  if (dayOfWeek === 0) return d.subtract(2, 'day');
  return d;
}

/**
 * Common date range calculator.
 */
async function calculateDateRange(range, customStart, customEnd, userId) {
  let start = customStart;
  let end = customEnd;

  if (range === 'daily') {
    start = dayjs().tz().format('YYYY-MM-DD');
    end = dayjs().tz().format('YYYY-MM-DD');
  } else if (range === 'weekly') {
    start = dayjs().tz().startOf('isoWeek').format('YYYY-MM-DD');
    end = dayjs().tz().endOf('isoWeek').format('YYYY-MM-DD');
  } else if (range === 'monthly') {
    // SECURITY: Fetch personal payday from profiles table
    const { data: profileData } = await supabase
      .from('profiles')
      .select('budget_cycle_day')
      .eq('id', userId)
      .single();

    const payDay = profileData?.budget_cycle_day || 1;
    
    const cycle = await getCycleRange(payDay);
    start = cycle.start;
    end = cycle.end;
  }
  
  return { start, end };
}

/**
 * Fetch aggregated statistics like total income, expense, and category breakdown.
 */
async function getSummaryStats({ range, startDate, endDate, userId }) {
  const { start, end } = await calculateDateRange(range, startDate, endDate, userId);

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId) // SECURITY: Only fetch user's own data
    .gte('transaction_date', start || dayjs().tz().startOf('month').format('YYYY-MM-DD'))
    .lte('transaction_date', end || dayjs().tz().endOf('month').format('YYYY-MM-DD'));

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
async function getTransactionList({ limit, category, transaction_type, startDate, endDate, userId }) {
  const { start, end } = await calculateDateRange(null, startDate, endDate, userId);
  
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId) // SECURITY: Only fetch user's own data
    .order('transaction_date', { ascending: false })
    .limit(limit || 5);

  if (start) query = query.gte('transaction_date', start);
  if (end) query = query.lte('transaction_date', end);
  if (transaction_type) query = query.eq('transaction_type', transaction_type);
  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) throw error;

  return data;
}

/**
 * Helper to get the actual payday adjusted for weekends (last working day)
 */
function getActualPayday(date, payDay) {
  let d = dayjs(date).date(payDay);
  // Ensure we don't overflow the month (e.g. Feb 30)
  if (d.date() !== payDay && payDay > 28) {
    d = dayjs(date).endOf('month');
  }

  const dayOfWeek = d.day(); // 0 = Sunday, 6 = Saturday
  if (dayOfWeek === 6) return d.subtract(1, 'day');
  if (dayOfWeek === 0) return d.subtract(2, 'day');
  return d;
}

/**
 * Get current financial cycle range (Payday to Payday)
 */
async function getCycleRange(payDay = 25) {
  const today = dayjs().tz();
  const currentPayday = getActualPayday(today, payDay);

  let start, end;
  if (today.isBefore(currentPayday, 'day')) {
    start = getActualPayday(today.subtract(1, 'month'), payDay);
    end = currentPayday.subtract(1, 'day');
  } else {
    start = currentPayday;
    end = getActualPayday(today.add(1, 'month'), payDay).subtract(1, 'day');
  }

  return {
    start: start.startOf('day').format('YYYY-MM-DD'),
    end: end.endOf('day').format('YYYY-MM-DD')
  };
}

/**
 * Gets budget statistics for a specific period.
 */
async function getBudgetReport({ userId, period, payDay = 25 }) {
  let start, end;
  if (period) {
    start = dayjs(period).startOf('month').format('YYYY-MM-DD');
    end = dayjs(period).endOf('month').format('YYYY-MM-DD');
  } else {
    // DEFAULT: Use Financial Cycle (Dashboard Style)
    const cycle = await getCycleRange(payDay);
    start = cycle.start;
    end = cycle.end;
  }

  // 1. Get budgets
  const { data: budgetLimits, error: budgetError } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId);

  if (budgetError) throw budgetError;

  // 2. Get spending within cycle
  const { data: actuals, error: actualError } = await supabase
    .from('transactions')
    .select('category, amount')
    .eq('user_id', userId)
    .eq('transaction_type', 'Expense')
    .gte('transaction_date', start)
    .lte('transaction_date', end);

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
async function generateFinancialReport({ range = 'weekly', userId }) {
  const { start, end } = await calculateDateRange(range, null, null, userId);
  
  // Use a more robust query for categories to match dashboard perfectly
  const { data: stats, error } = await supabase
    .from('transactions')
    .select('amount, category, item_name')
    .eq('user_id', userId)
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

/**
 * Fetch the master list of active categories (Budgets + Transactions).
 * Used for AI classification and dashboard filters.
 */
async function getActiveCategories(userId) {
  const { data: budgets } = await supabase.from('budgets').select('category').eq('user_id', userId);
  const { data: transactions } = await supabase.from('transactions').select('category').eq('user_id', userId);

  const budgetCats = (budgets || []).map(b => b.category);
  const txCats = (transactions || []).map(t => t.category);

  let allCats = Array.from(new Set([...budgetCats, ...txCats])).sort();
  
  if (allCats.length === 0) {
    allCats = STANDARD_CATEGORIES;
  }

  return allCats;
}

module.exports = { 
  getTransactionList, 
  getSummaryStats, 
  getBudgetReport,
  generateFinancialReport,
  getActiveCategories
};
