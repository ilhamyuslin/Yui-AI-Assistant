require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, item_name, amount, transaction_date, created_at')
    .gte('transaction_date', '2026-04-30')
    .order('transaction_date', { ascending: false });
    
  console.log("Raw transactions for 30 Apr and 1 May:");
  console.table(data);
}

check();
