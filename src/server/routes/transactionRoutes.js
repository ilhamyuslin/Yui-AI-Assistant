/**
 * transactionRoutes.js
 * API routes for financial transactions and budgeting.
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../../storage/supabaseClient');
const dayjs = require('dayjs');

/**
 * GET /api/transactions
 * Fetch transactions with date range filtering.
 */
router.get('/', async (req, res) => {
  const { startDate, endDate, transaction_type } = req.query;

  try {
    let query = supabase
      .from('transactions')
      .select('*')
      .order('transaction_date', { ascending: false });

    if (startDate) query = query.gte('transaction_date', startDate);
    if (endDate) query = query.lte('transaction_date', endDate);
    if (transaction_type) query = query.eq('transaction_type', transaction_type);

    const { data, error } = await query;
    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/transactions/stats
 * Aggregate stats for charts.
 */
router.get('/stats', async (req, res) => {
  const { period, startDate, endDate } = req.query;
  
  try {
    const start = startDate || dayjs(period).startOf('month').toISOString();
    const end = endDate || dayjs(period).endOf('month').toISOString();

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .gte('transaction_date', start)
      .lte('transaction_date', end);

    if (error) throw error;

    // Calculate totals and grouping
    const stats = {
      total_income: 0,
      total_expense: 0,
      net_savings: 0,
      categories: {},
      sources: {},
      daily_trend: {}
    };

    // Initialize daily_trend according to the range
    const diffDays = dayjs(end).diff(dayjs(start), 'day');
    for (let i = 0; i <= diffDays; i++) {
      const dateStr = dayjs(start).add(i, 'day').format('YYYY-MM-DD');
      stats.daily_trend[dateStr] = { income: 0, expense: 0 };
    }

    transactions.forEach(tx => {
      const amt = parseFloat(tx.amount || 0);
      const dateStr = dayjs(tx.transaction_date).format('YYYY-MM-DD');

      if (tx.transaction_type === 'Income') {
        stats.total_income += amt;
        if (stats.daily_trend[dateStr]) stats.daily_trend[dateStr].income += amt;
      } else if (tx.transaction_type === 'Expense') {
        stats.total_expense += amt;
        if (stats.daily_trend[dateStr]) stats.daily_trend[dateStr].expense += amt;
        // Group by category
        stats.categories[tx.category] = (stats.categories[tx.category] || 0) + amt;
      }

      // Group by source (fund source)
      stats.sources[tx.source_of_fund] = (stats.sources[tx.source_of_fund] || 0) + amt;
    });

    stats.net_savings = stats.total_income - stats.total_expense;

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const { STANDARD_CATEGORIES } = require('../../constants/categories');

/**
 * GET /api/transactions/budgets
 * Fetch all budgets with current actual spending.
 */
router.get('/budgets', async (req, res) => {
  const period = req.query.period || dayjs().format('YYYY-MM');

  try {
    // 1. Get all budget limits from DB
    const { data: budgetLimits, error: budgetError } = await supabase
      .from('budgets')
      .select('*')
      .order('category', { ascending: true });

    if (budgetError) throw budgetError;

    // Create a map of existing budget limits
    const budgetMap = {};
    if (budgetLimits) {
      budgetLimits.forEach(b => {
        budgetMap[b.category] = b.amount;
      });
    }

    // 2. Get actual spending for current period
    const startOfMonth = dayjs(period).startOf('month').toISOString();
    const endOfMonth = dayjs(period).endOf('month').toISOString();

    const { data: actuals, error: actualError } = await supabase
      .from('transactions')
      .select('category, amount')
      .eq('transaction_type', 'Expense')
      .gte('transaction_date', startOfMonth)
      .lte('transaction_date', endOfMonth);

    if (actualError) throw actualError;

    // Aggregate actuals
    const actualMap = {};
    actuals.forEach(tx => {
      actualMap[tx.category] = (actualMap[tx.category] || 0) + parseFloat(tx.amount);
    });

    // 3. Merge EVERYTHING based on STANDARD_CATEGORIES
    const result = STANDARD_CATEGORIES.map(category => {
      return {
        category,
        amount: budgetMap[category] || 0,
        actual: actualMap[category] || 0
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/transactions/budgets
 * Upsert budget for a category.
 */
router.post('/budgets', async (req, res) => {
  const { category, amount } = req.body;

  try {
    const { data, error } = await supabase
      .from('budgets')
      .upsert({ category, amount, updated_at: new Date().toISOString() }, { onConflict: 'category' })
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
