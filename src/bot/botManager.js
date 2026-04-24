require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { registerHandlers, setConfig } = require('./handlers');
const { initScheduler } = require('./scheduler');
const { initGemini } = require('../ai/gemini');

let botInstance = null;
let schedulerActive = false;
let botStatus = 'stopped'; // 'stopped' | 'starting' | 'running' | 'error'
let botError = null;
let botInfo = null;
let activeModel = null;
let startTime = null;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Ensures the bot instance exists. Creates it if missing.
 */
function ensureBotInstance(token) {
  if (botInstance) {
    // If token changed, we MUST destroy and recreate
    if (botInstance.token !== token) {
      console.log('[BotManager] Token changed. Recreating bot instance...');
      botInstance.stopPolling();
      botInstance.removeAllListeners();
      botInstance = new TelegramBot(token, { polling: false });
    }
    return botInstance;
  }

  console.log('[BotManager] Creating new bot instance...');
  botInstance = new TelegramBot(token, { polling: false });
  registerHandlers(botInstance);
  return botInstance;
}

/**
 * Start or resume the bot.
 */
async function startBot(config) {
  if (!config.telegram_token) {
    botStatus = 'error';
    botError = 'Telegram token missing.';
    return;
  }

  try {
    botStatus = 'starting';
    botError = null;

    // Update dependencies
    initGemini(config);
    setConfig(config);
    activeModel = config.gemini_model;

    // 1. Ensure instance exists
    const bot = ensureBotInstance(config.telegram_token);

    // 2. Start Polling (if not in Vercel)
    const isVercel = process.env.VERCEL === '1';
    if (!isVercel) {
      if (!bot.isPolling()) {
        console.log('[BotManager] Starting polling...');
        await bot.startPolling();
      }
    } else {
      // Webhook logic for Vercel
      const webhookUrl = process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/api/webhook/telegram` : null;
      if (webhookUrl) await bot.setWebHook(webhookUrl);
    }

    // 3. Fetch Info if missing
    if (!botInfo) {
      const me = await bot.getMe();
      botInfo = { id: me.id, first_name: me.first_name, username: me.username };
      console.log(`[BotManager] Bot @${me.username} is active.`);
    }

    botStatus = 'running';
    startTime = startTime || Date.now();

    // 4. Init Scheduler (only once)
    if (!schedulerActive) {
      initScheduler(bot);
      schedulerActive = true;
    }

    // Error listener (once only)
    if (bot.listeners('polling_error').length === 0) {
      bot.on('polling_error', (err) => {
        if (err.message.includes('409 Conflict')) return;
        console.error('[BotManager] Polling error:', err.message);
      });
    }

  } catch (err) {
    botStatus = 'error';
    botError = err.message;
    console.error('[BotManager] Start failed:', err.message);
  }
}

/**
 * Stop polling without destroying the instance.
 */
async function stopBot() {
  if (!botInstance) return;

  try {
    console.log('[BotManager] Stopping bot activity...');
    if (botInstance.isPolling()) {
      await botInstance.stopPolling();
    }
    botStatus = 'stopped';
    startTime = null;
    console.log('[BotManager] Bot stopped (polling idle).');
  } catch (err) {
    console.error('[BotManager] Stop error:', err.message);
  }
}

/**
 * Restart coordinates a full stop and start.
 */
async function restartBot(config) {
  await stopBot();
  await sleep(1000);
  await startBot(config);
}

async function getLatency() {
  if (!botInstance) return '0 ms';
  try {
    const start = Date.now();
    await botInstance.getMe();
    return `${Date.now() - start} ms`;
  } catch {
    return 'Error';
  }
}

async function getStatus() {
  const uptimeMs = startTime ? Date.now() - startTime : 0;
  const hours = Math.floor(uptimeMs / 3600000);
  const mins = Math.floor((uptimeMs % 3600000) / 60000);
  const secs = Math.floor((uptimeMs % 60000) / 1000);
  
  const latency = await getLatency();

  return {
    status: botStatus,
    error: botError,
    bot_info: botInfo,
    active_model: activeModel,
    mode: process.env.VERCEL === '1' ? 'webhook' : 'polling',
    uptime: startTime ? `${hours}h ${mins}m ${secs}s` : '00:00:00',
    memory: (process.memoryUsage().rss / 1024 / 1024).toFixed(1) + ' MB',
    api_latency: latency,
    node_version: process.version
  };
}

function processWebhook(body) {
  if (botInstance) botInstance.processUpdate(body);
}

module.exports = { startBot, stopBot, restartBot, getStatus, processWebhook };
