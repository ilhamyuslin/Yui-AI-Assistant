const { supabase } = require('../src/storage/supabaseClient');
require('dotenv').config();

async function audit() {
  console.log('--- DB AUDIT START ---');
  console.log('DEFAULT_USER_ID:', process.env.DEFAULT_USER_ID);

  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error fetching accounts:', error.message);
    } else {
      console.log('Columns found in accounts table:', Object.keys(data[0] || {}));
      console.log('Sample data:', data[0]);
    }
  } catch (e) {
    console.error('Audit failed:', e.message);
  }
  console.log('--- DB AUDIT END ---');
}

audit();
