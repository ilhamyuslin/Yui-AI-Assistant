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
  const { startDate, endDate, transaction_type, category } = req.query;

  try {
    let query = supabase
      .from('transactions')
      .select('*')
      .order('transaction_date', { ascending: false });

    if (startDate) query = query.gte('transaction_date', startDate);
    if (endDate) query = query.lte('transaction_date', endDate);
    if (transaction_type) query = query.eq('transaction_type', transaction_type);
    if (category) {
      const categories = Array.isArray(category) ? category : [category];
      query = query.in('category', categories);
    }

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
    const { period, startDate, endDate, category } = req.query;
    
    try {
      const start = startDate || dayjs(period).startOf('month').toISOString();
      const end = endDate || dayjs(period).endOf('month').toISOString();
      const startDateObj = dayjs(start);
      const endDateObj = dayjs(end);
      const diffDays = endDateObj.diff(startDateObj, 'day');
      const isSingleDay = diffDays === 0;

      // Adjust query range for single day comparison
      let queryStart = start;
      if (isSingleDay) {
        queryStart = startDateObj.subtract(1, 'day').toISOString();
      }
  
      let query = supabase
        .from('transactions')
        .select('*')
        .gte('transaction_date', queryStart)
        .lte('transaction_date', end);

      if (category) {
        const categories = Array.isArray(category) ? category : [category];
        query = query.in('category', categories);
      }

      const { data: transactions, error } = await query;
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

      // Initialize daily trend according to the range
    if (isSingleDay) {
      // 3-day window: Yesterday, Today, Tomorrow
      const yesterday = startDateObj.subtract(1, 'day').format('YYYY-MM-DD');
      const today = startDateObj.format('YYYY-MM-DD');
      const tomorrow = startDateObj.add(1, 'day').format('YYYY-MM-DD');
      
      stats.daily_trend[yesterday] = { income: 0, expense: 0 };
      stats.daily_trend[today] = { income: 0, expense: 0 };
      stats.daily_trend[tomorrow] = { income: 0, expense: 0 };
    } else {
      // For longer ranges, we can shrink the starting point to the first transaction 
      // if the requested start is very far in the past (like the 'All' filter)
      let trendStart = startDateObj;
      let trendEnd = endDateObj;
      
      if (diffDays > 31 && transactions.length > 0) {
        const firstTxDate = dayjs(transactions[0].transaction_date).startOf('day');
        if (firstTxDate.isAfter(startDateObj)) {
          trendStart = firstTxDate;
        }
      }

      const activeDiff = trendEnd.diff(trendStart, 'day');
      for (let i = 0; i <= activeDiff; i++) {
        const dateStr = trendStart.add(i, 'day').format('YYYY-MM-DD');
        stats.daily_trend[dateStr] = { income: 0, expense: 0 };
      }
    }

      transactions.forEach(tx => {
        const amt = parseFloat(tx.amount || 0);
        const txTime = dayjs(tx.transaction_date);
        const txDay = txTime.format('YYYY-MM-DD');
        
        // Determine if this transaction belongs to the filtered range for totals
        // Use inclusive check for dates
        const isFilteredDay = (txTime.isAfter(startDateObj) || txTime.isSame(startDateObj, 'day')) && 
                             (txTime.isBefore(endDateObj) || txTime.isSame(endDateObj, 'day'));

        if (tx.transaction_type === 'Income') {
          if (isFilteredDay) stats.total_income += amt;
          if (stats.daily_trend[txDay]) stats.daily_trend[txDay].income += amt;
        } else if (tx.transaction_type === 'Expense') {
          if (isFilteredDay) {
            stats.total_expense += amt;
            // Group by category ONLY for filtered day
            stats.categories[tx.category] = (stats.categories[tx.category] || 0) + amt;
          }
          if (stats.daily_trend[txDay]) stats.daily_trend[txDay].expense += amt;
        }

        // Group by source (fund source) ONLY for filtered day
        if (isFilteredDay) {
          stats.sources[tx.source_of_fund] = (stats.sources[tx.source_of_fund] || 0) + amt;
        }
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
  const { startDate, endDate, period } = req.query;
  const targetPeriod = period || dayjs().format('YYYY-MM');

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
    const startRange = startDate || dayjs(targetPeriod).startOf('month').toISOString();
    const endRange = endDate || dayjs(targetPeriod).endOf('month').toISOString();

    const { data: actuals, error: actualError } = await supabase
      .from('transactions')
      .select('category, amount')
      .eq('transaction_type', 'Expense')
      .gte('transaction_date', startRange)
      .lte('transaction_date', endRange);

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

/**
 * PUT /api/transactions/:id
 * Update an existing transaction.
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { amount, category, transaction_type, transaction_date, item_name, source_of_fund } = req.body;

  try {
    const { data, error } = await supabase
      .from('transactions')
      .update({
        amount: parseFloat(amount),
        category,
        transaction_type,
        transaction_date,
        item_name,
        source_of_fund
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    if (data.length === 0) return res.status(404).json({ error: 'Transaction not found' });

    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/transactions/:id
 * Remove a transaction.
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/transactions/categories
 * Fetch the master list of standard categories.
 */
router.get('/categories', (req, res) => {
  res.json(STANDARD_CATEGORIES);
});

module.exports = router;
