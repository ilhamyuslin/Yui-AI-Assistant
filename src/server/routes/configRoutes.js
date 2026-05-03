/**
 * configRoutes.js
 * REST API routes for the Web Config Dashboard.
 */

const express = require('express');
const router = express.Router();
const { getConfig, saveConfig } = require('../../storage/configStore');
const { supabase } = require('../../storage/supabaseClient');

// GET /api/config — Return current config (mask sensitive values)
router.get('/', async (req, res) => {
  try {
    const config = await getConfig(req.user.id);
    // Mask API keys for display
    res.json({
      ...config,
      gemini_api_key: config.gemini_api_key ? maskSecret(config.gemini_api_key) : '',
      _has_gemini_key: !!config.gemini_api_key,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/config — Save config
router.post('/', async (req, res) => {
  try {
    const { gemini_api_key, gemini_model, system_instruction, budget_cycle_day } = req.body;

    // Build update object (only include non-masked values)
    const updates = {};
    if (budget_cycle_day !== undefined) updates.budget_cycle_day = parseInt(budget_cycle_day);
    if (gemini_api_key && !gemini_api_key.includes('*')) updates.gemini_api_key = gemini_api_key.trim();
    if (gemini_model) updates.gemini_model = gemini_model;
    if (system_instruction !== undefined) updates.system_instruction = system_instruction;

    await saveConfig(req.user.id, updates);

    res.json({ success: true, message: 'Konfigurasi AI berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/status — DB Ping only (Bot status removed)
router.get('/status', async (req, res) => {
  try {
    let dbStatus = { state: 'connected', host: 'Supabase' };

    try {
      // Quick ping to check Supabase connection
      const { error } = await supabase.from('ai_assistant_config').select('id').limit(1);
      if (error) throw error;

      // Get masked host from URL
      const url = process.env.SUPABASE_URL || '';
      if (url.includes('supabase.co')) {
        const projectId = url.split('//')[1].split('.')[0];
        dbStatus.host = `Supabase (${projectId.slice(0, 4)}...${projectId.slice(-2)})`;
      }
    } catch (err) {
      dbStatus.state = 'error';
      dbStatus.host = 'Disconnected';
      console.warn('[Status] DB Health Check failed:', err.message);
    }

    res.json({ db_status: dbStatus });
  } catch (err) {
    console.error('[Status Route] Error:', err.message);
    res.status(500).json({ error: 'Gagal mengambil status sistem.' });
  }
});

// POST /api/config/test-gemini — Test Gemini API key
router.post('/test-gemini', async (req, res) => {
  console.log('[Test Gemini] Incoming Key:', req.body.gemini_api_key ? (req.body.gemini_api_key.includes('*') ? 'MASKED' : 'PROVIDED') : 'EMPTY');
  try {
    let { gemini_api_key, gemini_model } = req.body;
    
    // Fallback ke database jika input adalah sensor (ada bintang)
    if (gemini_api_key && gemini_api_key.includes('*')) {
      const config = await getConfig(req.user.id);
      gemini_api_key = config.gemini_api_key;
    }

    if (!gemini_api_key) return res.status(400).json({ error: 'API key tidak boleh kosong.' });

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(gemini_api_key);
    const model = genAI.getGenerativeModel({ model: gemini_model || 'gemma-4' });
    const result = await model.generateContent('Balas hanya dengan satu kata: OK');
    const text = result.response.text().trim();

    res.json({ success: true, response: text });
  } catch (err) {
    console.error('Test Gemini Error:', err.message);
    res.status(400).json({ error: `Gagal: ${err.message}` });
  }
});


function maskSecret(str) {
  if (!str || str.length < 10) return '***';
  return str.slice(0, 6) + '***' + str.slice(-4);
}

// GET /api/config/cycle — Return payday for cycle calculation
router.get('/cycle', async (req, res) => {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('budget_cycle_day')
      .eq('id', req.user.id)
      .single();
    
    res.json({ payDay: data?.budget_cycle_day || 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
