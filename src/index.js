/**
 * index.js — Main entry point for AI Assistant
 * 1. Start Express dashboard server
 * 2. Load config from Supabase
 * 3. Start Telegram bot
 */

require('dotenv').config();
const { startServer } = require('./server/apiServer');
const { getConfig } = require('./storage/configStore');
const { startBot } = require('./bot/botManager');
const { startHeartbeat } = require('./services/heartbeatService');
const { startCommandListener } = require('./services/commandService');

async function main() {
  console.log('🚀 Starting AI Assistant...\n');

  // Start reporting and listening for remote commands
  startHeartbeat();
  startCommandListener();

  // Start the web dashboard server
  startServer();

  // Load config and start the bot
  try {
    const config = await getConfig();

    if (config.telegram_token && config.gemini_api_key) {
      await startBot(config);
    } else {
      console.warn('⚠️  Bot not started: Missing Telegram token or Gemini API key.');
      console.warn('   → Open the dashboard to configure your bot.\n');
    }
  } catch (err) {
    console.error('❌ Failed to load config:', err.message);
    console.warn('   → The dashboard is still running. Configure your bot there.\n');
  }
}

main();
