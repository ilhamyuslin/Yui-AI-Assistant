/**
 * status.js
 * handles bot status polling and maintenance controls
 */

import { API } from './api.js';
import { showToast } from './utils.js';

let statusInterval = null;

export function initStatus() {
  document.querySelector('#tab-status .btn-primary')?.addEventListener('click', restartBotFromDashboard);
  startStatusPolling();
}

function startStatusPolling() {
  fetchStatus();
  statusInterval = setInterval(fetchStatus, 5000);
}

export function stopStatusPolling() {
  if (statusInterval) clearInterval(statusInterval);
}

async function fetchStatus() {
  try {
    const res = await fetch(API.status);
    const data = await res.json();
    updateStatusUI(data);
  } catch (_) {
    updateStatusUI({ status: 'error', error: 'Tidak dapat terhubung ke server.' });
  }
}

function updateStatusUI({ status, error }) {
  const dot = document.querySelector('.status-dot');
  const label = document.querySelector('.status-label');
  const badge = document.getElementById('botStatusBadge');
  const gBadge = document.getElementById('geminiStatusBadge');
  const errorBox = document.getElementById('errorBox');

  const statusMap = {
    running:  { dot: 'running', label: 'Bot Aktif', badge: 'status-ok', text: '🟢 Berjalan' },
    starting: { dot: 'running', label: 'Memulai...', badge: 'status-warn', text: '🟡 Memulai...' },
    stopped:  { dot: 'stopped', label: 'Bot Mati', badge: 'status-warn', text: '⚪ Berhenti' },
    error:    { dot: 'error', label: 'Error', badge: 'status-error', text: '🔴 Error' },
  };

  const s = statusMap[status] || statusMap.stopped;

  if (dot) dot.className = `status-dot ${s.dot}`;
  if (label) label.textContent = s.label;

  if (badge) {
    badge.className = `status-badge ${s.badge}`;
    badge.textContent = s.text;
  }

  if (gBadge) {
    if (status === 'running') {
      gBadge.className = 'status-badge status-ok';
      gBadge.textContent = '🟢 Terhubung';
    } else {
      gBadge.className = 'status-badge status-warn';
      gBadge.textContent = '⚪ Standby';
    }
  }

  if (errorBox) {
    if (error) {
      errorBox.textContent = '⚠️ ' + error;
      errorBox.classList.remove('hidden');
    } else {
      errorBox.classList.add('hidden');
    }
  }
}

async function restartBotFromDashboard() {
  try {
    await fetch(API.config, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // Empty save triggers restart
    });
    showToast('🔄 Bot sedang restart...', 'success');
  } catch (err) {
    showToast('✗ ' + err.message, 'error');
  }
}
