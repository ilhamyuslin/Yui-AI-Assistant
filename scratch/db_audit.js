
const { supabase } = require('../src/storage/supabaseClient');

async function auditSupabase() {
  console.log('🚀 Memulai Audit Struktur Tabel Supabase...\n');

  try {
    // Karena kita tidak bisa akses information_schema langsung via client JS biasa tanpa RPC,
    // Kita akan coba fetch 1 baris dari tabel-tabel yang terdeteksi di kode.
    const tables = ['accounts', 'transactions', 'budgets', 'ai_chat_histories', 'ai_assistant_config'];
    
    for (const table of tables) {
      console.log(`Checking table: ${table}...`);
      const { data, error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
        console.log(`❌ Gagal akses tabel [${table}]: ${error.message}`);
        continue;
      }

      if (data && data.length >= 0) {
        const firstRow = data[0] || {};
        const columns = Object.keys(firstRow);
        
        if (columns.length === 0) {
            // Jika tabel kosong, kita coba ambil skema kolom via rpc jika ada, 
            // tapi sebagai fallback kita anggap tabel ini butuh atensi.
            console.log(`⚠️ Tabel [${table}] kosong, tidak bisa deteksi kolom via baris data.`);
            continue;
        }

        const hasUserId = columns.includes('user_id');
        console.log(`✅ Tabel [${table}] terdeteksi.`);
        console.log(`   Kolom: ${columns.join(', ')}`);
        console.log(`   Status Multi-User: ${hasUserId ? '🔒 AMAN (Ada user_id)' : '🚫 BAHAYA (Tidak ada user_id!)'}`);
      }
      console.log('-----------------------------------');
    }

  } catch (err) {
    console.error('❌ Error saat audit:', err.message);
  }
  process.exit();
}

auditSupabase();
