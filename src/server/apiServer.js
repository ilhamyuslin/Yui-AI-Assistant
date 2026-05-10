/**
 * apiServer.js
 * Express server for the Web Config Dashboard.
 * Protected by simple password-based session auth.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const os = require('os');
const configRoutes = require('./routes/configRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const accountRoutes = require('./routes/accountRoutes');
const chatRoutes = require('./routes/chatRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// session middleware removed for serverless compatibility




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


  res.status(401).json({ error: 'Unauthorized. Silakan login terlebih dahulu.' });
}

async function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const { supabase } = require('../storage/supabaseClient');
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();
      
    if (profile && profile.role === 'admin') {
      return next();
    }
  } catch (e) {
    console.error('[AdminAuth] Error checking admin status:', e);
  }
  
  res.status(403).json({ error: 'Forbidden. Admin access required.' });
}

// ─── API Routes ───────────────────────────────────────────────
app.use('/api/config', requireAuth, configRoutes);
app.use('/api/transactions', requireAuth, transactionRoutes);
app.use('/api/accounts', requireAuth, accountRoutes);
app.use('/api/chat', requireAuth, chatRoutes);
app.use('/api/admin', requireAuth, requireAdmin, adminRoutes);

function startServer() {
  const localIp = getLocalIp();
  // Don't listen if we are in Vercel. Vercel serverless handles listening automatically.
  if (process.env.VERCEL !== '1') {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🌐 Dashboard Status:`);
      console.log(`   - Local:   http://localhost:${PORT}`);
      console.log(`   - Network: http://${localIp}:${PORT}\n`);
    });
  }
}

module.exports = { startServer, app };
