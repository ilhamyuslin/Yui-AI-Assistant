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
 * Returns { history: array, total_tokens: number }
 */
async function getHistory(userId) {
  const { data, error } = await supabase
    .from('ai_chat_histories')
    .select('history, total_tokens')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return { history: [], total_tokens: 0 };
  }

  return {
    history: data.history || [],
    total_tokens: data.total_tokens || 0
  };
}

/**
 * Append a new turn to the history and persist.
 */
async function appendHistory(userId, username, userMessage, modelMessage, tokens = 0) {
  const { history, total_tokens } = await getHistory(userId);

  history.push(
    { role: 'user', parts: [{ text: userMessage }] },
    { role: 'model', parts: [{ text: modelMessage }] }
  );

  // Trim to max turns (each turn = 2 entries)
  while (history.length > MAX_HISTORY_TURNS * 2) history.shift();

  const newTotal = (total_tokens || 0) + tokens;

  // Persist to Supabase
  await supabase
    .from('ai_chat_histories')
    .upsert({
      user_id: userId,
      username: username || null,
      history,
      total_tokens: newTotal,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    
  return { total_tokens: newTotal };
}

/**
 * Clear conversation history for a user.
 */
async function clearHistory(userId) {
  await supabase
    .from('ai_chat_histories')
    .update({ 
      history: [], 
      total_tokens: 0,
      updated_at: new Date().toISOString() 
    })
    .eq('user_id', userId);
}

module.exports = { getHistory, appendHistory, clearHistory };
