
const { supabase } = require('../src/storage/supabaseClient');

async function scanAllTables() {
  console.log('🔍 Mencari semua tabel di schema public...\n');

  try {
    // Mencoba teknik menebak tabel umum atau mencari via rpc jika ada
    // Karena kita pakai SERVICE_ROLE, kita bisa coba query langsung ke list tabel
    // Note: Supabase JS client tidak mendukung raw SQL, jadi kita pakai pendekatan deteksi.
    
    const possibleTables = [
        'users', 'profiles', 'accounts', 'transactions', 'budgets', 
        'ai_chat_histories', 'ai_assistant_config', 'telegram_logs', 
        'bot_settings', 'user_settings', 'categories'
    ];

    for (const table of possibleTables) {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (!error) {
        console.log(`✅ Terdeteksi Tabel: [${table}]`);
        const firstRow = data[0] || {};
        const columns = Object.keys(firstRow);
        console.log(`   Kolom: ${columns.join(', ')}`);
        console.log(`   Multi-User: ${columns.includes('user_id') ? '🔒 YES' : '🚫 NO'}`);
        console.log('---');
      }
    }

    console.log('\nAudit Selesai.');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
  process.exit();
}

scanAllTables();
