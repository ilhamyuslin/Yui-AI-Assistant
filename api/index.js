const { app } = require('../src/server/apiServer');

// ONLY export the Express server.
// The bot will NOT start in Vercel to prevent serverless crashes.
module.exports = app;
