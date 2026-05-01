const { supabase } = require('./src/storage/supabaseClient');
async function run() {
  const { data, error } = await supabase.from('ai_chat_histories').select('*');
  console.log("DB DATA:", data);
  if (error) console.error("DB ERROR:", error);
}
run();
