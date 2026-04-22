/**
 * apiServer.js
 * Express server for the Web Config Dashboard.
 * Protected by simple password-based session auth.
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const os = require('os');
const configRoutes = require('./routes/configRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const accountRoutes = require('./routes/accountRoutes');
const botManager = require('../bot/botManager');

const app = express();
const PORT = process.env.PORT || 3000;
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || '1234567890';

// Enable trust proxy for tunnels (Ngrok, Pinggy, etc.)
app.set('trust proxy', 1);

// Helper to get local IP
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Middleware
app.use(cors({ 
  origin: (origin, callback) => {
    // Allow localhost, local network, and common tunnel domains
    if (!origin || 
        origin.includes('localhost') || 
        origin.includes('127.0.0.1') || 
        origin.includes('vercel.app') ||
        origin.includes('yui-ai-assistant.vercel.app') ||
        /\.(pinggy-free\.link|ngrok-free\.app|trycloudflare\.com)$/.test(origin) || 
        /^http:\/\/(192\.168\.|10\.|172\.)/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'ai-assistant-session-secret-' + DASHBOARD_PASSWORD,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: 'auto', // Automatically uses secure cookies if the request is HTTPS (tunnel)
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 
  },
}));


// Serve dashboard static files
const dashboardPath = path.join(__dirname, '../../dashboard');
app.use(express.static(dashboardPath));

// ─── Auth Routes ──────────────────────────────────────────────
app.post('/auth/login', (req, res) => {
  const { password } = req.body;
  console.log(`[Auth] Login attempt with password: ${password === DASHBOARD_PASSWORD ? 'CORRECT' : 'WRONG'}`);
  
  if (password === DASHBOARD_PASSWORD) {
    req.session.authenticated = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Password salah.' });
  }
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/auth/check', (req, res) => {
  res.json({ authenticated: req.session.authenticated === true });
});

// ─── Auth Middleware for API ──────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session.authenticated) return next();
  res.status(401).json({ error: 'Unauthorized. Silakan login terlebih dahulu.' });
}

// ─── API Routes ───────────────────────────────────────────────
app.use('/api/config', requireAuth, configRoutes);
app.use('/api/transactions', requireAuth, transactionRoutes);
app.use('/api/accounts', requireAuth, accountRoutes);

// ─── Webhook Route (No Auth) ──────────────────────────────────
app.post('/api/webhook/telegram', (req, res) => {
  botManager.processWebhook(req.body);
  res.sendStatus(200);
});

// ─── Catch-all: serve dashboard ───────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(dashboardPath, 'index.html'));
});

function startServer() {
  const localIp = getLocalIp();
  // Don't listen if we are in Vercel. Vercel serverless handles listening automatically.
  if (process.env.VERCEL !== '1') {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🌐 Dashboard Status:`);
      console.log(`   - Local:   http://localhost:${PORT}`);
      console.log(`   - Network: http://${localIp}:${PORT}`);
      console.log(`🔐 Password: ${DASHBOARD_PASSWORD}\n`);
    });
  }
}

module.exports = { startServer, app };
