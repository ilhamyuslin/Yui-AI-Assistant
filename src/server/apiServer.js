/**
 * apiServer.js
 * Express server for the Web Config Dashboard.
 * Protected by simple password-based session auth.
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');

const os = require('os');
const configRoutes = require('./routes/configRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const accountRoutes = require('./routes/accountRoutes');
const chatRoutes = require('./routes/chatRoutes');
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
// session middleware removed for serverless compatibility



// Helper to parse cookies
function getAuthCookie(req) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/auth_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// ─── Auth Routes ──────────────────────────────────────────────
app.post('/auth/login', (req, res) => {
  const { password } = req.body;
  if (password === DASHBOARD_PASSWORD) {
    // Set a cookie valid for 1 day
    res.cookie('auth_token', DASHBOARD_PASSWORD, {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.VERCEL === '1',
      sameSite: 'lax'
    });
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Password salah.' });
  }
});

app.post('/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});

app.get('/auth/check', (req, res) => {
  res.json({ authenticated: getAuthCookie(req) === DASHBOARD_PASSWORD });
});

// ─── Auth Middleware for API ──────────────────────────────────
async function requireAuth(req, res, next) {
  // Method 2: Supabase JWT Bearer token (new Supabase auth system)
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const { supabase } = require('../storage/supabaseClient');
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (user && !error) {
        req.user = user; // Attach user object to request
        return next();
      }
    } catch (e) {
      // Fall through
    }
  }

  // Method 1: Legacy cookie auth (old password system fallback)
  if (getAuthCookie(req) === DASHBOARD_PASSWORD) {
    req.user = { id: 'legacy_web_user' };
    return next();
  }

  res.status(401).json({ error: 'Unauthorized. Silakan login terlebih dahulu.' });
}

// ─── API Routes ───────────────────────────────────────────────
app.use('/api/config', requireAuth, configRoutes);
app.use('/api/transactions', requireAuth, transactionRoutes);
app.use('/api/accounts', requireAuth, accountRoutes);
app.use('/api/chat', requireAuth, chatRoutes);

// ─── Webhook Route (No Auth) ──────────────────────────────────
app.post('/api/webhook/telegram', (req, res) => {
  botManager.processWebhook(req.body);
  res.sendStatus(200);
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
