require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkHistory() {
  const { data, error } = await supabase
    .from('ai_chat_histories')
    .select('history')
    .limit(1);
    
  if (error || !data || data.length === 0) {
    console.error("DB Error:", error);
    return;
  }
    
  console.log("=== ISI CHAT HISTORY DI DATABASE ===");
  const history = data[0].history;
  history.slice(-10).forEach(row => {
    console.log(`[${row.role}]`, row.parts[0].text.replace(/\n/g, '\\n').substring(0, 100));
  });
}

checkHistory();
