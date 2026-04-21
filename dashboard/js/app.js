/**
 * app.js — v4 Moonlight Emerald
 * Entry point for AI Assistant Dashboard
 */

import { checkAuth, initAuth, logout } from './auth.js';
import { initDashboard, refreshDashboardData } from './dashboard.js';
import { initConfig, loadConfig } from './config.js';
import { initStatus } from './status.js';

document.addEventListener('DOMContentLoaded', async () => {
  initSidebar();
  initNavigation();
  initAuth({ onLoginSuccess: showDashboard });
  initDashboard();
  initConfig();
  initStatus();

  document.getElementById('logoutBtn')?.addEventListener('click', logout);

  const authenticated = await checkAuth();
  if (authenticated) {
    showDashboard();
  } else {
    showLogin();
  }
});

/* ── Collapsible Sidebar ── */
function initSidebar() {
  const toggle  = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  if (!toggle || !sidebar) return;

  // Restore state
  if (localStorage.getItem('sidebar-collapsed') === 'true') {
    sidebar.classList.add('collapsed');
  }

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('collapsed'));
  });
}

/* ── Tab Navigation ── */
function initNavigation() {
  document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      switchTab(item.dataset.tab);
    });
  });
}

function switchTab(tabId) {
  // Update nav items
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.getElementById(`nav-${tabId}`);
  if (navEl) navEl.classList.add('active');

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  const tabEl = document.getElementById(`tab-${tabId}`);
  if (tabEl) tabEl.classList.add('active');

  // Refresh data if needed
  if (tabId === 'overview') refreshDashboardData();
}

/* ── Show / Hide Screens ── */
function showLogin() {
  document.getElementById('loginOverlay')?.classList.remove('hidden');
  document.getElementById('dashboard')?.classList.add('hidden');
}

function showDashboard() {
  document.getElementById('loginOverlay')?.classList.add('hidden');
  document.getElementById('dashboard')?.classList.remove('hidden');
  loadConfig();
  refreshDashboardData();
}
