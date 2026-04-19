/**
 * app.js
 * Entry point for AI Assistant Dashboard
 */

import { checkAuth, initAuth, logout } from './auth.js';
import { initDashboard, refreshDashboardData } from './dashboard.js';
import { initConfig, loadConfig } from './config.js';
import { initStatus } from './status.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Setup UI components first
  initNavigation();
  initAuth({ onLoginSuccess: showDashboard });
  initDashboard();
  initConfig();
  initStatus();

  document.getElementById('logoutBtn')?.addEventListener('click', logout);

  // 2. Check login status
  const authenticated = await checkAuth();
  if (authenticated) {
    showDashboard();
  } else {
    showLogin();
  }
});

function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = item.dataset.tab;
      handleTabSwitch(tab, item);
    });
  });
}

function handleTabSwitch(tab, clickedItem) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

  clickedItem.classList.add('active');
  const target = document.getElementById(`tab-${tab}`);
  if (target) target.classList.add('active');

  // Refresh data if switching to overview
  if (tab === 'overview') refreshDashboardData();
}

function showLogin() {
  document.getElementById('loginOverlay')?.classList.remove('hidden');
  document.getElementById('dashboard')?.classList.add('hidden');
}

function showDashboard() {
  document.getElementById('loginOverlay')?.classList.add('hidden');
  document.getElementById('dashboard')?.classList.remove('hidden');
  
  // Trigger initial data load
  loadConfig();
  refreshDashboardData();
}
