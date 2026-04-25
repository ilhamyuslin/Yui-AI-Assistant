/**
 * commandService.js
 * Polls for remote commands from the dashboard (Supabase bot_commands table).
 */

const { supabase } = require('../storage/supabaseClient');

let commandInterval = null;

async function checkCommands() {
  try {
    // 1. Cari perintah pending yang paling baru
    const { data: commands, error } = await supabase
      .from('bot_commands')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    if (!commands || commands.length === 0) return;

    const cmd = commands[0];
    console.log(`[Command] Received remote command: ${cmd.command}`);

    // 2. LANGSUNG tandai completed biar nggak looping (Double Guard)
    const { error: updateError } = await supabase
      .from('bot_commands')
      .update({ status: 'completed' })
      .eq('id', cmd.id);

    if (updateError) throw updateError;

    // 3. Eksekusi Perintah
    if (cmd.command === 'restart') {
      console.log('🔄 Restart command received. Shutting down to trigger restart...');
      // Kita exit dengan code 0. 
      // Supaya ini beneran restart, lu harus jalanin bot-nya pake PM2 atau script loop.
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    }
  } catch (err) {
    console.error('[Command] Error checking commands:', err.message);
  }
}

function startCommandListener(intervalMs = 30000) {
  if (commandInterval) return;
  
  console.log('🛰️  Command listener active (checking for remote commands every 30s)');
  
  // Check immediately
  checkCommands();
  
  commandInterval = setInterval(checkCommands, intervalMs);
}

function stopCommandListener() {
  if (commandInterval) {
    clearInterval(commandInterval);
    commandInterval = null;
  }
}

module.exports = { startCommandListener, stopCommandListener };
