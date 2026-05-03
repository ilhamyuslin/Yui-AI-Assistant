/**
 * index.js — Main entry point for AI Assistant (Web-Chat Only)
 * 1. Start Express API & Dashboard server
 */

require('dotenv').config();
const { startServer } = require('./server/apiServer');

async function main() {
  console.log('🚀 Starting AI Assistant (Serverless Mode)...\n');

  // Start the web dashboard and chat API server
  startServer();
}

main();
