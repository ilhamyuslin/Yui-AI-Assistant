const { app } = require('../src/server/apiServer');
const { getConfig } = require('../src/storage/configStore');
const { startBot } = require('../src/bot/botManager');

let isInitialized = false;

module.exports = async (req, res) => {
  // Ensure the bot is initialized on Vercel cold starts before handling the request
  if (process.env.VERCEL === '1' && !isInitialized) {
    try {
      console.log('[Vercel] Cold start detected. Initializing config & bot...');
      const config = await getConfig();
      if (config && config.telegram_token && config.gemini_api_key) {
        await startBot(config);
      }
      isInitialized = true;
    } catch (e) {
      console.error('[Vercel] Failed to initialize bot during cold start:', e);
    }
  }
  
  // Forward to Express app
  return app(req, res);
};
