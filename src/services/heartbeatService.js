/**
 * heartbeatService.js
 * Reports real bot status to Supabase using data from BotManager.
 */

const { supabase } = require('../storage/supabaseClient');
const { getStatus } = require('../bot/botManager');

let heartbeatInterval = null;

async function reportStatus() {
  try {
    // Ambil data asli dari BotManager
    const realStatus = await getStatus();
    
    const { error } = await supabase
      .from('bot_status')
      .upsert({
        id: 1,
        status: realStatus.status,
        bot_mode: realStatus.mode === 'webhook' ? 'Webhook' : 'Polling',
        last_heartbeat: new Date().toISOString(),
        memory_usage: realStatus.memory,
        uptime: realStatus.uptime,
        node_version: realStatus.node_version,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('[Heartbeat] Failed to report status:', error.message);
    }
  } catch (err) {
    console.error('[Heartbeat] Error during status report:', err.message);
  }
}

function startHeartbeat(intervalMs = 60000) {
  if (heartbeatInterval) return;
  
  console.log('💓 Heartbeat service started (reporting real bot status)');
  
  // Report immediately on start
  reportStatus();
  
  heartbeatInterval = setInterval(reportStatus, intervalMs);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

module.exports = { startHeartbeat, stopHeartbeat };
