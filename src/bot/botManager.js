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

    // Create bot in polling mode
    botInstance = new TelegramBot(config.telegram_token, { polling: true });

    // Pass config to handlers
    setConfig(config);
    registerHandlers(botInstance);

    botStatus = 'running';
    console.log('[BotManager] Bot started successfully! Polling for messages...');

    // Handle polling errors
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
    console.log('[BotManager] Stopping bot polling...');
    await botInstance.stopPolling({ cancel: true });
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
    model: botInstance ? 'running' : null,
  };
}

module.exports = { startBot, stopBot, restartBot, getStatus };
