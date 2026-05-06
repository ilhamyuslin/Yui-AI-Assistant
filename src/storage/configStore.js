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

  console.log(`[ConfigStore] Fetching for: ${userId}`);

  // 1. Get Gemini Config
  const { data: configData, error: configError } = await supabase
    .from('ai_assistant_config')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (configError) {
    console.log(`[ConfigStore] Error or Not Found: ${configError.message}`);
  }

  // 2. Get Cycle Day and Names from Profiles
  const { data: profileData } = await supabase
    .from('profiles')
    .select('budget_cycle_day, full_name, nickname')
    .eq('id', userId)
    .single();

  const config = configData || {};
  
  // VALIDASI MATI: Pastikan ID yang dapet dari DB beneran punya user ini
  // Kalau beda atau ga ada, jangan kasih API Key!
  const actualApiKey = (config.user_id === userId) ? (config.gemini_api_key || '') : '';

  const finalConfig = {
    user_id: config.user_id,
    gemini_api_key: actualApiKey,
    gemini_model: config.gemini_model || DEFAULT_CONFIG.gemini_model,
    system_instruction: config.system_instruction || DEFAULT_CONFIG.system_instruction,
    budget_cycle_day: profileData?.budget_cycle_day || 1,
    full_name: profileData?.full_name || '',
    nickname: profileData?.nickname || '',
  };

  console.log(`[ConfigStore] Security Check - User: ${userId}, Key Valid: ${!!actualApiKey}`);
  return finalConfig;
}

async function saveConfig(userId, updates) {
  if (!userId) throw new Error('User ID is required to save configuration');

  const { budget_cycle_day, ...cleanUpdates } = updates;

  // 1. Update AI Config
  const { data, error } = await supabase
    .from('ai_assistant_config')
    .upsert({ 
      user_id: userId,
      ...cleanUpdates, 
      updated_at: new Date().toISOString() 
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw new Error(`Failed to save AI config: ${error.message}`);

  // 2. Update Cycle Day in Profiles if provided
  if (budget_cycle_day !== undefined) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ budget_cycle_day: parseInt(budget_cycle_day) })
      .eq('id', userId);
    
    if (profileError) throw new Error(`Failed to save profile: ${profileError.message}`);
  }

  return data;
}

module.exports = { getConfig, saveConfig, DEFAULT_CONFIG };
