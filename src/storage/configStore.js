/**
 * configStore.js
 * Manages reading/writing the bot configuration from Supabase.
 * Config is stored in the `ai_assistant_config` table (single row).
 */

const { supabase } = require('./supabaseClient');

const DEFAULT_CONFIG = {
  telegram_token: '',
  gemini_api_key: '',
  gemini_model: 'gemini-3.1-flash-lite-preview',
  system_instruction: 'Kamu adalah AI assistant pribadi yang cerdas, ramah, dan sangat membantu. Kamu berbicara dalam bahasa Indonesia secara natural dan santai.',
  whitelisted_users: [],
  budget_cycle_day: 1,
};

async function getConfig() {
  const { data, error } = await supabase
    .from('ai_assistant_config')
    .select('*')
    .eq('id', 1)
    .single();

  if (error || !data) {
    console.warn('[Config] Using default config:', error?.message);
    return { ...DEFAULT_CONFIG };
  }

  return {
    telegram_token: data.telegram_token || '',
    gemini_api_key: data.gemini_api_key || '',
    gemini_model: data.gemini_model || DEFAULT_CONFIG.gemini_model,
    system_instruction: data.system_instruction || DEFAULT_CONFIG.system_instruction,
    whitelisted_users: data.whitelisted_users || [],
    budget_cycle_day: data.budget_cycle_day || DEFAULT_CONFIG.budget_cycle_day,
  };
}

async function saveConfig(updates) {
  const { data, error } = await supabase
    .from('ai_assistant_config')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select()
    .single();

  if (error) throw new Error(`Failed to save config: ${error.message}`);
  return data;
}

module.exports = { getConfig, saveConfig, DEFAULT_CONFIG };
