/**
 * summaryStore.js
 * Manages database operations for financial summaries and transaction history.
 */

const { supabase } = require('./supabaseClient');

/**
 * Gets the financial summary and top categories for a date range.
 */
async function getFinancialSummary(startDate, endDate) {
  try {
    // 1. Get overall stats (Income, Expense, Savings)
    const { data: stats, error: statsError } = await supabase.rpc('get_financial_dashboard_stats', {
      p_user_id: process.env.DEFAULT_USER_ID,
      p_start_date: startDate,
      p_end_date: endDate,
      p_categories: null
    });

    if (statsError) throw statsError;

    // 2. Get breakdown by category for expenses
    const { data: categories, error: catError } = await supabase
      .from('transactions')
      .select('category, amount')
      .eq('transaction_type', 'Expense')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`);

    if (catError) throw catError;

    // Aggregate categories manually for more flexibility
    const breakdown = {};
    categories.forEach(row => {
      breakdown[row.category] = (breakdown[row.category] || 0) + Number(row.amount);
    });

    const sortedCategories = Object.entries(breakdown)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    return { 
      success: true, 
      data: {
        ...stats,
        top_categories: sortedCategories // Return all categories sorted by amount
      }
    };
  } catch (err) {
    console.error('[SummaryStore] Error fetching summary:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Fetches recent transactions with filtering support (limit, type, date, category).
 */
async function getRecentTransactions(params = {}) {
  const { limit = 10, type, startDate, endDate, category } = params;
  
  try {
    let query = supabase
      .from('transactions')
      .select('*')
      .order('transaction_date', { ascending: false })
      .limit(limit);

    if (type) query = query.eq('transaction_type', type);
    if (category) query = query.ilike('category', `%${category}%`); // Use ilike for partial matching
    if (startDate) query = query.gte('transaction_date', startDate);
    if (endDate) {
      const fullEndDate = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`;
      query = query.lte('transaction_date', fullEndDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return { success: true, data };
  } catch (err) {
    console.error('[SummaryStore] Error fetching transactions:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { getFinancialSummary, getRecentTransactions };
