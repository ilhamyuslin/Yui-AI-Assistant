/**
 * logger.js
 * Logs conversation messages to Supabase `ai_conversation_logs` table.
 * Fire-and-forget: errors are logged to console but never throw.
 */

const { supabase } = require('./supabaseClient');

async function logMessage({ userId, username, firstName, role, message, tokensUsed = 0 }) {
  try {
    await supabase.from('ai_conversation_logs').insert({
      user_id: userId,
      username: username || null,
      first_name: firstName || null,
      role,
      message,
      tokens_used: tokensUsed,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Logger] Failed to log message:', err.message);
  }
}

module.exports = { logMessage };
