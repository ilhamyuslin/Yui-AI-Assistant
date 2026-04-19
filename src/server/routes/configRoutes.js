/**
 * configRoutes.js
 * REST API routes for the Web Config Dashboard.
 */

const express = require('express');
const router = express.Router();
const { getConfig, saveConfig } = require('../../storage/configStore');
const { restartBot, getStatus } = require('../../bot/botManager');

// GET /api/config — Return current config (mask sensitive values)
router.get('/', async (req, res) => {
  try {
    const config = await getConfig();
    // Mask API keys for display
    res.json({
      ...config,
      telegram_token: config.telegram_token ? maskSecret(config.telegram_token) : '',
      gemini_api_key: config.gemini_api_key ? maskSecret(config.gemini_api_key) : '',
      _has_telegram_token: !!config.telegram_token,
      _has_gemini_key: !!config.gemini_api_key,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/config — Save config and restart bot
router.post('/', async (req, res) => {
  try {
    const { telegram_token, gemini_api_key, gemini_model, system_instruction, whitelisted_users } = req.body;

    // Build update object (only include non-masked values)
    const updates = {};
    if (telegram_token && !telegram_token.includes('*')) updates.telegram_token = telegram_token.trim();
    if (gemini_api_key && !gemini_api_key.includes('*')) updates.gemini_api_key = gemini_api_key.trim();
    if (gemini_model) updates.gemini_model = gemini_model;
    if (system_instruction !== undefined) updates.system_instruction = system_instruction;
    if (whitelisted_users !== undefined) {
      // Parse newline-separated list of user IDs
      const ids = String(whitelisted_users)
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(Boolean)
        .map(Number)
        .filter(n => !isNaN(n));
      updates.whitelisted_users = ids;
    }

    await saveConfig(updates);

    // Fetch full config and restart bot
    const freshConfig = await getConfig();
    restartBot(freshConfig).catch(err => console.error('[Route] Restart error:', err.message));

    res.json({ success: true, message: 'Config tersimpan. Bot sedang restart...' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/status — Bot status
router.get('/status', (req, res) => {
  res.json(getStatus());
});

// POST /api/config/test-gemini — Test Gemini API key
router.post('/test-gemini', async (req, res) => {
  try {
    const { gemini_api_key, gemini_model } = req.body;
    if (!gemini_api_key) return res.status(400).json({ error: 'API key diperlukan.' });

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(gemini_api_key);
    const model = genAI.getGenerativeModel({ model: gemini_model || 'gemini-3.1-flash-lite-preview' });
    const result = await model.generateContent('Balas hanya dengan: OK');
    const text = result.response.text();

    res.json({ success: true, response: text });
  } catch (err) {
    res.status(400).json({ error: `Test gagal: ${err.message}` });
  }
});

// POST /api/config/test-telegram — Test Telegram token
router.post('/test-telegram', async (req, res) => {
  try {
    const { telegram_token } = req.body;
    if (!telegram_token) return res.status(400).json({ error: 'Token diperlukan.' });

    const TelegramBot = require('node-telegram-bot-api');
    const testBot = new TelegramBot(telegram_token);
    const me = await testBot.getMe();

    res.json({ success: true, bot_name: me.first_name, bot_username: me.username });
  } catch (err) {
    res.status(400).json({ error: `Test gagal: ${err.message}` });
  }
});

function maskSecret(str) {
  if (!str || str.length < 10) return '***';
  return str.slice(0, 6) + '***' + str.slice(-4);
}

module.exports = router;
