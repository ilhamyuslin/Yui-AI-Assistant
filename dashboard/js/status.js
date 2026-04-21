/**
 * status.js
 * handles bot status polling and maintenance controls
 */

import { API } from './api.js';
import { showToast } from './utils.js';

let statusInterval = null;

export function initStatus() {
  document.getElementById('refreshStatusBtn')?.addEventListener('click', fetchStatus);
  document.getElementById('powerBtn')?.addEventListener('click', togglePower);
  document.getElementById('restartBtn')?.addEventListener('click', restartBot);
  
  // Initial fetch
  fetchStatus();
}

// Polling removed as per user request for manual refresh

async function fetchStatus() {
  const btn = document.getElementById('refreshStatusBtn');
  if (btn) btn.classList.add('loading');
  
  try {
    const res = await fetch(API.status);
    const data = await res.json();
    updateStatusUI(data);
  } catch (err) {
    console.error('[Status] Fetch failed:', err);
    updateStatusUI({ status: 'error', error: 'Tidak dapat terhubung ke server API.' });
  } finally {
    if (btn) {
      setTimeout(() => btn.classList.remove('loading'), 500);
    }
  }
}

function updateStatusUI(data) {
  const { status, error, bot_info, active_model, db_status } = data;
  
  // 1. Telegram Bot Card
  const botNameLabel = document.getElementById('telegramBotName');
  const botBadge = document.getElementById('botStatusBadge');
  const botPulse = document.getElementById('botStatusPulse');
  
  if (status === 'running' && bot_info) {
    if (botNameLabel) botNameLabel.textContent = `${bot_info.first_name} (@${bot_info.username})`;
    if (botBadge) {
      botBadge.className = 'status-badge status-ok';
      botBadge.textContent = 'ONLINE';
    }
    if (botPulse) botPulse.classList.add('active');
  } else if (status === 'starting') {
    if (botNameLabel) botNameLabel.textContent = 'Memulai session...';
    if (botBadge) {
      botBadge.className = 'status-badge status-warn';
      botBadge.textContent = 'STARTING';
    }
    if (botPulse) botPulse.classList.remove('active');
  } else {
    if (botNameLabel) botNameLabel.textContent = 'Bot Offline / Belum Aktif';
    if (botBadge) {
      botBadge.className = 'status-badge status-error';
      botBadge.textContent = 'OFFLINE';
    }
    if (botPulse) botPulse.classList.remove('active');
  }

  // 2. Gemini Card
  const gLabel = document.getElementById('geminiModelLabel');
  const gBadge = document.getElementById('geminiStatusBadge');
  if (status === 'running' && active_model) {
    if (gLabel) gLabel.textContent = active_model;
    if (gBadge) {
      gBadge.className = 'status-badge status-ok';
      gBadge.textContent = 'ACTIVE';
    }
  } else {
    if (gLabel) gLabel.textContent = 'Standby';
    if (gBadge) {
      gBadge.className = 'status-badge status-warn';
      gBadge.textContent = 'IDLE';
    }
  }

  // 3. Database Card
  const dbBadge = document.getElementById('dbStatusBadge');
  if (dbBadge) {
    if (db_status === 'connected') {
      dbBadge.className = 'status-badge status-ok';
      dbBadge.textContent = 'CONNECTED';
    } else {
      dbBadge.className = 'status-badge status-error';
      dbBadge.textContent = 'DISCONNECTED';
    }
  }

  // 4. Power Button Toggle
  const powerBtn = document.getElementById('powerBtn');
  const powerText = document.getElementById('powerText');
  const powerIcon = document.getElementById('powerIcon');
  
  if (powerBtn && powerText) {
    if (status === 'running') {
      powerBtn.className = 'btn btn-lg btn-danger';
      powerText.textContent = 'Hentikan Bot';
    } else if (status === 'starting') {
      powerBtn.className = 'btn btn-lg btn-outline loading';
      powerText.textContent = 'Memulai...';
    } else {
      powerBtn.className = 'btn btn-lg btn-primary';
      powerText.textContent = 'Jalankan Bot';
    }
  }

  // 5. Error Box
  const errorBox = document.getElementById('errorBox');
  if (errorBox) {
    if (error) {
      errorBox.textContent = '⚠️ ' + error;
      errorBox.classList.remove('hidden');
    } else {
      errorBox.classList.add('hidden');
    }
  }
}

async function togglePower() {
  const powerBtn = document.getElementById('powerBtn');
  const powerText = document.getElementById('powerText');
  
  // Check current status from UI mapping (or we could fetch it fresh)
  const isRunning = powerBtn.classList.contains('btn-danger');
  const endpoint = isRunning ? '/api/status/stop' : '/api/status/start';
  const actionText = isRunning ? 'Menghentikan...' : 'Memulai...';

  if (powerBtn) powerBtn.classList.add('loading');
  if (powerText) powerText.textContent = actionText;

  try {
    const res = await fetch(endpoint, { method: 'POST' });
    const data = await res.json();
    
    if (data.success) {
      showToast(data.message, 'success');
    } else {
      showToast(data.error || 'Gagal mengubah status bot.', 'error');
    }
  } catch (err) {
    showToast('Koneksi gagal: ' + err.message, 'error');
  } finally {
    // Wait bit then refresh status
    setTimeout(fetchStatus, 1500);
  }
}

async function restartBot() {
  const btn = document.getElementById('restartBtn');
  if (btn) btn.classList.add('loading');
  
  try {
    const res = await fetch('/api/status/restart', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('🔄 Bot sedang me-restart...', 'success');
    } else {
      showToast(data.error || 'Gagal me-restart bot.', 'error');
    }
  } catch (err) {
    showToast('Koneksi gagal: ' + err.message, 'error');
  } finally {
    setTimeout(fetchStatus, 3000);
  }
}
