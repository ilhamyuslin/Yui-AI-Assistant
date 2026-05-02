const { supabase } = require('../src/storage/supabaseClient');
require('dotenv').config();

async function auditBudget() {
  console.log('--- BUDGET DB AUDIT START ---');
  try {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error fetching budgets:', error.message);
    } else {
      console.log('Columns found in budgets table:', Object.keys(data[0] || {}));
      console.log('Sample data:', data[0]);
    }
  } catch (e) {
    console.error('Audit failed:', e.message);
  }
  console.log('--- BUDGET DB AUDIT END ---');
}

auditBudget();
