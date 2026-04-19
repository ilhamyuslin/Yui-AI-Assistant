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
const configRoutes = require('./routes/configRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const accountRoutes = require('./routes/accountRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || '1234567890';

// Middleware
app.use(cors({ 
  origin: (origin, callback) => {
    // Allow localhost and 127.0.0.1 on any port locally
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
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
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
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

// ─── Catch-all: serve dashboard ───────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(dashboardPath, 'index.html'));
});

function startServer() {
  app.listen(PORT, () => {
    console.log(`\n🌐 Dashboard running at: http://localhost:${PORT}`);
    console.log(`🔐 Password: ${DASHBOARD_PASSWORD}\n`);
  });
}

module.exports = { startServer };
