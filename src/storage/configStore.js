/**
 * configStore.js
 * Manages reading/writing the bot configuration from Supabase.
 * Config is stored in the `ai_assistant_config` table (single row).
 */

const { supabase } = require('./supabaseClient');

const DEFAULT_CONFIG = {
  gemini_api_key: '',
  gemini_model: 'gemini-3.1-flash-lite-preview',
  system_instruction: 'Kamu adalah AI assistant pribadi yang cerdas, ramah, dan sangat membantu. Kamu berbicara dalam bahasa Indonesia secara natural dan santai.',
};

async function getConfig(userId) {
  if (!userId) return { ...DEFAULT_CONFIG, budget_cycle_day: 1 };

  // 1. Get Gemini Config
  const { data: configData, error: configError } = await supabase
    .from('ai_assistant_config')
    .select('*')
    .eq('user_id', userId)
    .single();

  // 2. Get Cycle Day from Profiles
  const { data: profileData } = await supabase
    .from('profiles')
    .select('budget_cycle_day')
    .eq('id', userId)
    .single();

  const config = configData || {};
  
  return {
    gemini_api_key: config.gemini_api_key || '',
    gemini_model: config.gemini_model || DEFAULT_CONFIG.gemini_model,
    system_instruction: config.system_instruction || DEFAULT_CONFIG.system_instruction,
    budget_cycle_day: profileData?.budget_cycle_day || 1,
  };
}

async function saveConfig(userId, updates) {
  if (!userId) throw new Error('User ID is required to save configuration');

  const { budget_cycle_day, ...cleanUpdates } = updates;

  const { data, error } = await supabase
    .from('ai_assistant_config')
    .upsert({ 
      user_id: userId,
      ...cleanUpdates, 
      updated_at: new Date().toISOString() 
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw new Error(`Failed to save config: ${error.message}`);
  return data;
}

module.exports = { getConfig, saveConfig, DEFAULT_CONFIG };
