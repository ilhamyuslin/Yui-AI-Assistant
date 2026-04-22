/**
 * botManager.js
 * Manages the lifecycle of the Telegram bot.
 * Supports hot-reload: stop old bot → apply new config → start fresh bot.
 */

const TelegramBot = require('node-telegram-bot-api');
const { registerHandlers, setConfig } = require('./handlers');
const { initGemini } = require('../ai/gemini');

let botInstance = null;
let botStatus = 'stopped'; // 'stopped' | 'starting' | 'running' | 'error'
let botError = null;
let botInfo = null; // { id, first_name, username }
let activeModel = null;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Start the bot with the given config.
 */
async function startBot(config) {
  if (botInstance) await stopBot();

  if (!config.telegram_token) {
    botStatus = 'error';
    botError = 'Telegram token belum dikonfigurasi.';
    console.error('[BotManager]', botError);
    return;
  }

  if (!config.gemini_api_key) {
    botStatus = 'error';
    botError = 'Gemini API key belum dikonfigurasi.';
    console.error('[BotManager]', botError);
    return;
  }

  try {
    botStatus = 'starting';
    botError = null;

    // Initialize Gemini
    initGemini(config);

    // Create bot instance based on environment (Vercel = Webhook, Local = Polling)
    const isVercel = process.env.VERCEL === '1';

    if (isVercel) {
      botInstance = new TelegramBot(config.telegram_token);
      
      const webhookUrl = process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/api/webhook/telegram` : null;
      if (webhookUrl) {
        botInstance.setWebHook(webhookUrl).then(() => {
          console.log(`[BotManager] Webhook configured: ${webhookUrl}`);
        }).catch(err => {
          console.error('[BotManager] Failed to set webhook:', err.message);
        });
      } else {
        console.warn('[BotManager] ⚠️ PUBLIC_URL is unset in Vercel! Telegram Webhook cannot be registered.');
      }
    } else {
      botInstance = new TelegramBot(config.telegram_token, { polling: true });
    }

    // Pass config to handlers
    setConfig(config);
    registerHandlers(botInstance);

    botStatus = 'running';
    activeModel = config.gemini_model;
    
    // Fetch Bot Info
    botInstance.getMe().then(me => {
      botInfo = {
        id: me.id,
        first_name: me.first_name,
        username: me.username
      };
      console.log(`[BotManager] Bot info fetched: @${me.username}`);
    }).catch(err => {
      console.warn('[BotManager] Failed to fetch bot info:', err.message);
    });

    if (isVercel) {
      console.log('[BotManager] Bot started in WEBHOOK mode! Awaiting requests...');
    } else {
      console.log('[BotManager] Bot started successfully! Polling for messages...');

      // Handle polling errors (only for Polling mode)
      botInstance.on('polling_error', (err) => {
        // Ignore 409 during transitions briefly
        if (err.code === 'ETELEGRAM' && err.message.includes('409 Conflict')) {
          return; 
        }
        
        console.error('[BotManager] Polling error:', err.message);
        if (err.code === 'ETELEGRAM' && err.message.includes('Unauthorized')) {
          botStatus = 'error';
          botError = 'Token Telegram tidak valid (Unauthorized).';
          stopBot();
        }
      });
    }

  } catch (err) {
    botStatus = 'error';
    botError = err.message;
    console.error('[BotManager] Failed to start bot:', err.message);
  }
}

/**
 * Stop the currently running bot.
 */
async function stopBot() {
  if (!botInstance) return;

  try {
    const isVercel = process.env.VERCEL === '1';
    
    if (isVercel) {
      console.log('[BotManager] Stopping bot webhook...');
      await botInstance.deleteWebHook();
    } else {
      console.log('[BotManager] Stopping bot polling...');
      await botInstance.stopPolling({ cancel: true });
    }
  } catch (err) {
    console.error('[BotManager] Error stopping bot:', err.message);
  }

  botInstance = null;
  botStatus = 'stopped';
  console.log('[BotManager] Bot stopped.');
}

/**
 * Restart the bot with new config (used after dashboard saves).
 */
async function restartBot(config) {
  console.log('[BotManager] Restarting bot... (Coordinating stop)');
  await stopBot();
  
  // Crucial: Wait for Telegram to acknowledge polling stop
  console.log('[BotManager] Waiting for polling to fully clear...');
  await sleep(2500); 
  
  await startBot(config);
}

function getStatus() {
  return {
    status: botStatus,
    error: botError,
    bot_info: botInfo,
    active_model: activeModel,
    mode: process.env.VERCEL === '1' ? 'webhook' : 'polling'
  };
}

/**
 * Forward webhook payloads to the bot instance
 */
function processWebhook(body) {
  if (botInstance) {
    botInstance.processUpdate(body);
  } else {
    console.warn('[BotManager] Received webhook but botInstance is null');
  }
}

module.exports = { startBot, stopBot, restartBot, getStatus, processWebhook };
