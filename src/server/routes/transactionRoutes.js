/**
 * transactionRoutes.js
 * API routes for financial transactions and budgeting.
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../../storage/supabaseClient');
const dayjs = require('dayjs');
const { getActiveCategories } = require('../../services/transactionService');

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
      .eq('user_id', req.user.id)
      .order('transaction_date', { ascending: false });

    if (startDate) query = query.gte('transaction_date', dayjs(startDate).startOf('day').toISOString());
    if (endDate) query = query.lte('transaction_date', dayjs(endDate).endOf('day').toISOString());
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
 * GET /api/transactions/categories
 * Fetch dynamic list of categories for the current user.
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await getActiveCategories(req.user.id);
    res.json(categories);
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
    let query = supabase.from('transactions').select('*').eq('user_id', req.user.id);

    // Handle string "null" from Axios or actual null/undefined
    const hasStartDate = startDate && startDate !== 'null';
    const hasEndDate = endDate && endDate !== 'null';

    let strictStartObj = null;
    let strictEndObj = null;

    if (hasStartDate || period) {
      strictStartObj = dayjs(hasStartDate ? startDate : period).startOf('day');
    }
    if (hasEndDate || period) {
      strictEndObj = dayjs(hasEndDate ? endDate : period).endOf('day');
    }

    if (strictStartObj && strictEndObj) {
      const isSingleDayQuery = strictStartObj.isSame(strictEndObj, 'day');
      
      let queryStartISO = strictStartObj.toISOString();
      // RESTORE: Adjust query range for single day comparison to fetch yesterday's data for the trend chart
      if (isSingleDayQuery) {
        queryStartISO = strictStartObj.subtract(1, 'day').toISOString();
      }
      
      query = query.gte('transaction_date', queryStartISO);
      query = query.lte('transaction_date', strictEndObj.toISOString());
    }

    if (category) {
      const categories = Array.isArray(category) ? category : [category];
      query = query.in('category', categories);
    }

    // Order by descending date so we can find the oldest and newest transaction easily
    query = query.order('transaction_date', { ascending: false });

    const { data: transactions, error } = await query;
    if (error) throw error;

    // --- DYNAMIC RANGE CALCULATION ---
    let startRange, endRange;

    if (strictStartObj && strictEndObj) {
      startRange = strictStartObj;
      endRange = strictEndObj;
    } else if (transactions.length > 0) {
      // The "All" filter: strictly use the first and last transaction dates
      endRange = dayjs(transactions[0].transaction_date).endOf('day'); // Newest
      startRange = dayjs(transactions[transactions.length - 1].transaction_date).startOf('day'); // Oldest
    } else {
      // Fallback if DB is completely empty and no dates provided
      startRange = dayjs().startOf('day');
      endRange = dayjs().endOf('day');
    }

    const diffDays = endRange.diff(startRange, 'day');
    const isSingleDay = diffDays === 0;

    const stats = {
      total_income: 0,
      total_expense: 0,
      net_savings: 0,
      categories: {},
      sources: {},
      daily_trend: {}
    };

    // Initialize daily trend
    if (isSingleDay) {
      const yesterday = startRange.subtract(1, 'day').format('YYYY-MM-DD');
      const today = startRange.format('YYYY-MM-DD');
      const tomorrow = startRange.add(1, 'day').format('YYYY-MM-DD');

      stats.daily_trend[yesterday] = { income: 0, expense: 0 };
      stats.daily_trend[today] = { income: 0, expense: 0 };
      stats.daily_trend[tomorrow] = { income: 0, expense: 0 };
    } else {
      // Create a point for every single day from the first transaction to the last
      for (let i = 0; i <= diffDays; i++) {
        const dateStr = startRange.add(i, 'day').format('YYYY-MM-DD');
        stats.daily_trend[dateStr] = { income: 0, expense: 0 };
      }
    }

    transactions.forEach(tx => {
      const amt = parseFloat(tx.amount || 0);
      const txTime = dayjs(tx.transaction_date);
      const txDay = txTime.format('YYYY-MM-DD');

      // RESTORE: Ensure yesterday's data isn't counted in today's totals
      let isFilteredDay = true;
      if (strictStartObj && strictEndObj) {
        isFilteredDay = (txTime.isAfter(strictStartObj) || txTime.isSame(strictStartObj, 'day')) &&
                        (txTime.isBefore(strictEndObj) || txTime.isSame(strictEndObj, 'day'));
      }

      if (tx.transaction_type === 'Income') {
        if (isFilteredDay) stats.total_income += amt;
        if (stats.daily_trend[txDay]) stats.daily_trend[txDay].income += amt;
      } else if (tx.transaction_type === 'Expense') {
        if (isFilteredDay) {
          stats.total_expense += amt;
          stats.categories[tx.category] = (stats.categories[tx.category] || 0) + amt;
        }
        if (stats.daily_trend[txDay]) stats.daily_trend[txDay].expense += amt;
      }

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
      .eq('user_id', req.user.id)
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
      .eq('user_id', req.user.id)
      .eq('transaction_type', 'Expense')
      .gte('transaction_date', startRange)
      .lte('transaction_date', endRange);

    if (actualError) throw actualError;

    if (actualError) throw actualError;

    // Aggregate actuals
    const actualMap = {};
    actuals.forEach(tx => {
      actualMap[tx.category] = (actualMap[tx.category] || 0) + parseFloat(tx.amount);
    });

    // 3. Merge: Only show standard categories if no custom data exists.
    // Otherwise, use budgets table and actual transactions as the source of truth.
    let baseCategories = [];
    if (Object.keys(budgetMap).length === 0 && Object.keys(actualMap).length === 0) {
      baseCategories = STANDARD_CATEGORIES;
    } else {
      baseCategories = Object.keys(budgetMap);
    }

    const allCategories = Array.from(new Set([
      ...baseCategories,
      ...Object.keys(actualMap)
    ])).sort();

    const result = allCategories.map(category => {
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
      .upsert({ user_id: req.user.id, category, amount, updated_at: new Date().toISOString() }, { onConflict: 'user_id,category' })
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/transactions/budgets/:category
 * Delete a budget entry.
 */
router.delete('/budgets/:category', async (req, res) => {
  const { category } = req.params;

  try {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('user_id', req.user.id)
      .eq('category', category);

    if (error) throw error;
    res.json({ message: `Budget for ${category} deleted` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/transactions/categories/rename
 * Rename a category in both budgets and transactions.
 */
router.put('/categories/rename', async (req, res) => {
  const { oldName, newName } = req.body;

  if (!oldName || !newName) {
    return res.status(400).json({ error: 'oldName and newName are required' });
  }

  try {
    // 1. Update ALL transactions with this category string
    const { error: txError } = await supabase
      .from('transactions')
      .update({ category: newName })
      .eq('user_id', req.user.id)
      .eq('category', oldName);

    if (txError) throw txError;

    // 2. Update the budget entry if it exists
    const { data: existingBudget } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('category', oldName)
      .maybeSingle();

    if (existingBudget) {
      const { error: budgetError } = await supabase
        .from('budgets')
        .update({ category: newName, updated_at: new Date().toISOString() })
        .eq('user_id', req.user.id)
        .eq('category', oldName);
      if (budgetError) throw budgetError;
    }

    res.json({ success: true, message: `Category renamed from ${oldName} to ${newName}` });
  } catch (err) {
    console.error('[Rename API] Error:', err);
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
      .eq('user_id', req.user.id)
      .select();

    if (error) throw error;
    if (data.length === 0) return res.status(404).json({ error: 'Transaction not found' });

    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const { deleteTransaction } = require('../../storage/expenseStore');

/**
 * DELETE /api/transactions/:id
 * Remove a transaction.
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await deleteTransaction(id, req.user.id);
    if (!result.success) {
      return res.status(result.error === 'Transaction not found' ? 404 : 500).json({ error: result.error });
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




module.exports = router;
