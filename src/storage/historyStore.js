/**
 * historyStore.js
 * Manages per-user chat history (persistent across restarts).
 * History stored in Supabase `ai_chat_histories` table.
 * In-memory cache reduces DB hits for active chats.
 */

const { supabase } = require('./supabaseClient');

// Cache dihilangkan agar Serverless safe

const MAX_HISTORY_TURNS = 20; // Keep last 20 turns (user+model pairs)

/**
 * Get conversation history for a user.
 * Returns array of { role: 'user'|'model', parts: [{ text }] }
 */
async function getHistory(userId) {
  const { data, error } = await supabase
    .from('ai_chat_histories')
    .select('history')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return [];
  }

  return data.history || [];
}

/**
 * Append a new turn to the history and persist.
 */
async function appendHistory(userId, username, userMessage, modelMessage) {
  const history = await getHistory(userId);

  history.push(
    { role: 'user', parts: [{ text: userMessage }] },
    { role: 'model', parts: [{ text: modelMessage }] }
  );

  // Trim to max turns (each turn = 2 entries)
  while (history.length > MAX_HISTORY_TURNS * 2) history.shift();

  // Persist to Supabase
  await supabase
    .from('ai_chat_histories')
    .upsert({
      user_id: userId,
      username: username || null,
      history,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
}

/**
 * Clear conversation history for a user.
 */
async function clearHistory(userId) {
  await supabase
    .from('ai_chat_histories')
    .update({ history: [], updated_at: new Date().toISOString() })
    .eq('user_id', userId);
}

module.exports = { getHistory, appendHistory, clearHistory };
