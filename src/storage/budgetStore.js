/**
 * budgetStore.js
 * Manages database operations for budgets and spending limits.
 * Now supports dynamic payday cycle detection.
 */

const { supabase } = require('./supabaseClient');

/**
 * Calculates the current budget cycle based on payday configuration.
 * @returns {Object} { startDate, endDate }
 */
async function getCurrentCycleRange(userId) {
  // 1. Fetch payday config from profiles table
  const { data: profileData } = await supabase
    .from('profiles')
    .select('budget_cycle_day')
    .eq('id', userId)
    .single();

  const payDay = profileData?.budget_cycle_day || 1;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  let startDate, endDate;

  if (day >= payDay) {
    // Current cycle started this month
    startDate = new Date(year, month, payDay);
    endDate = new Date(year, month + 1, payDay - 1);
  } else {
    // Current cycle started last month
    startDate = new Date(year, month - 1, payDay);
    endDate = new Date(year, month, payDay - 1);
  }

  // Format to YYYY-MM-DD
  const format = (d) => d.toISOString().split('T')[0];
  
  return {
    startDate: format(startDate),
    endDate: format(endDate)
  };
}

/**
 * Gets budget statistics (limit vs actual) for a specific period.
 * If no dates provided, defaults to current payday cycle.
 */
async function getBudgets(p_startDate, p_endDate, userId) {
  try {
    let startDate = p_startDate;
    let endDate = p_endDate;

    // Default to current payday cycle if dates are not provided
    if (!startDate || !endDate) {
      const cycle = await getCurrentCycleRange(userId);
      startDate = startDate || cycle.startDate;
      endDate = endDate || cycle.endDate;
    }

    // 1. Fetch budget limits
    const { data: budgetList, error: budgetError } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId) // SECURITY: Only user's budgets
      .order('category', { ascending: true });

    if (budgetError) throw budgetError;

    // 2. Fetch expenses for the period
    let txQuery = supabase
      .from('transactions')
      .select('category, amount')
      .eq('user_id', userId) // SECURITY: Only user's transactions
      .eq('transaction_type', 'Expense');

    if (startDate) txQuery = txQuery.gte('transaction_date', startDate);
    if (endDate) {
      const fullEndDate = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`;
      txQuery = txQuery.lte('transaction_date', fullEndDate);
    }

    const { data: txData, error: txError } = await txQuery;
    if (txError) throw txError;

    // 3. Aggregate
    const actuals = (txData || []).reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount);
      return acc;
    }, {});

    // 4. Merge
    const merged = budgetList.map(b => ({
      category_name: b.category,
      budget_limit: b.amount,
      actual_expense: actuals[b.category] || 0,
      remaining_budget: Number(b.amount) - (actuals[b.category] || 0),
      period_start: startDate,
      period_end: endDate
    }));

    return { success: true, data: merged };
  } catch (err) {
    console.error('[BudgetStore] Error fetching budgets:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Gets a unique list of category names from the budgets table.
 * Useful for providing AI with valid category options.
 */
async function getCategories(userId) {
  try {
    const { data, error } = await supabase
      .from('budgets')
      .select('category')
      .eq('user_id', userId); // SECURITY: Only user's categories
      
    if (error) throw error;
    
    // Return unique categories
    const categories = [...new Set(data.map(b => b.category))].filter(Boolean);
    return { success: true, data: categories };
  } catch (err) {
    console.error('[BudgetStore] Error fetching categories:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Adds or updates a budget for a category.
 * @param {Object} budgetData - { category, amount, behavior_group, id (optional) }
 */
async function upsertBudget(budgetData) {
  try {
    const payload = {
      user_id: budgetData.user_id, // Use passed user_id
      category: budgetData.category,
      amount: parseFloat(budgetData.amount || 0),
      behavior_group: budgetData.behavior_group || 'Want',
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('budgets')
      .upsert(payload, { onConflict: 'user_id,category' })
      .select()
      .single();

    if (error) {
      console.error('[BudgetStore] Error upserting budget:', error.message);
      throw error;
    }
    return { success: true, data: data, message: 'Anggaran berhasil disimpan!' };
  } catch (err) {
    console.error('[BudgetStore] Error upserting budget:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Deletes a budget category.
 */
async function deleteBudget(category, userId) {
  try {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('user_id', userId) // SECURITY: Only user's budgets
      .eq('category', category);

    if (error) throw error;
    return { success: true, message: 'Anggaran berhasil dihapus!' };
  } catch (err) {
    console.error('[BudgetStore] Error deleting budget:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { 
  getBudgets, 
  getCategories,
  upsertBudget,
  deleteBudget
};
