require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, item_name, amount, transaction_date, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log("Raw transactions from DB:");
  console.table(data);
}

check();
