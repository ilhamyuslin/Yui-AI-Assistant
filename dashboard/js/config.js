/**
 * config.js
 * handles bot configuration, whitelist, and API tests
 */

import { API, PRESETS } from './api.js';
import { setButtonLoading, showStatus, showToast, toggleVisibility } from './utils.js';

let whitelistedUsers = [];

export function initConfig() {
  // Setup visibility toggles
  document.querySelectorAll('.toggle-visibility').forEach(btn => {
    btn.addEventListener('click', () => {
      const inputId = btn.getAttribute('onclick')?.match(/'(.*?)'/)[1] || btn.dataset.target;
      if (inputId) toggleVisibility(inputId, btn);
    });
  });

  // Setup Test buttons
  document.getElementById('testTelegramBtn')?.addEventListener('click', testTelegram);
  document.getElementById('testGeminiBtn')?.addEventListener('click', testGemini);
  
  // Setup Preset buttons
  document.querySelectorAll('.preset-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.preset;
      if (type && PRESETS[type]) {
        document.getElementById('systemInstruction').value = PRESETS[type];
      }
    });
  });

  // Setup Save buttons
  document.getElementById('saveConfigBtn')?.addEventListener('click', saveConfig);
  document.querySelector('#tab-whitelist .btn-primary')?.addEventListener('click', saveWhitelist);

  // Initialize Day Selector Grid
  renderDaySelectorGrid();

  // Setup Whitelist Handlers
  document.getElementById('addWhitelistBtn')?.addEventListener('click', addWhitelistItem);
  document.getElementById('newWhitelistId')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addWhitelistItem();
  });
}

function renderWhitelist() {
  const container = document.getElementById('whitelistContainer');
  if (!container) return;

  if (whitelistedUsers.length === 0) {
    container.innerHTML = `
      <div class="empty-whitelist">
        <p>Belum ada user yang terdaftar di whitelist.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = whitelistedUsers.map((id, index) => `
    <div class="whitelist-item">
      <div class="whitelist-user-info">
        <div class="whitelist-user-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <span class="whitelist-user-id">${id}</span>
      </div>
      <button class="btn-remove-whitelist" onclick="window.configModule.removeWhitelistItem(${index})">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
      </button>
    </div>
  `).join('');
}

export function addWhitelistItem() {
  const input = document.getElementById('newWhitelistId');
  const id = input.value.trim();
  if (!id) return;

  if (whitelistedUsers.includes(id)) {
    showToast('User ID sudah ada di daftar', 'error');
    return;
  }

  whitelistedUsers.push(id);
  input.value = '';
  renderWhitelist();
}

export function removeWhitelistItem(index) {
  whitelistedUsers.splice(index, 1);
  renderWhitelist();
}

// Attach to window so onclick works
window.configModule = { removeWhitelistItem };

function renderDaySelectorGrid() {
  const grid = document.getElementById('daySelectorGrid');
  const input = document.getElementById('budgetCycleDay');
  if (!grid) return;

  grid.innerHTML = '';
  for (let i = 1; i <= 31; i++) {
    const chip = document.createElement('div');
    chip.className = 'day-chip';
    chip.textContent = i;
    chip.dataset.day = i;
    chip.addEventListener('click', () => selectDay(i));
    grid.appendChild(chip);
  }
}

function selectDay(day) {
  // Update UI
  document.querySelectorAll('.day-chip').forEach(c => {
    c.classList.toggle('active', parseInt(c.dataset.day) === day);
  });
  // Update Hidden Input
  const input = document.getElementById('budgetCycleDay');
  if (input) input.value = day;
  
  updateCyclePreview(day);
}

function updateCyclePreview(day) {
  const hint = document.getElementById('cyclePreviewHint');
  if (!hint) return;

  const now = new Date();
  let start, end;

  // Logic matches dashboard.js handleQuickFilter
  if (now.getDate() >= day) {
    start = new Date(now.getFullYear(), now.getMonth(), day);
  } else {
    start = new Date(now.getFullYear(), now.getMonth() - 1, day);
  }
  end = new Date(start.getFullYear(), start.getMonth() + 1, day - 1, 23, 59, 59);

  const fmt = (d) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  hint.innerHTML = `Siklus Saat Ini: <strong>${fmt(start)} — ${fmt(end)}</strong>`;
}

export async function loadConfig() {
  try {
    const res = await fetch(API.config);
    if (!res.ok) return;
    const config = await res.json();

    const tInput = document.getElementById('telegramToken');
    if (config._has_telegram_token) {
      tInput.placeholder = config.telegram_token + ' (tersimpan)';
      const status = document.getElementById('telegramStatus');
      if (status) { status.textContent = '✓ Token tersimpan'; status.className = 'field-hint success'; }
    }

    const gInput = document.getElementById('geminiKey');
    if (config._has_gemini_key) {
      gInput.placeholder = config.gemini_api_key + ' (tersimpan)';
      const status = document.getElementById('geminiStatus');
      if (status) { status.textContent = '✓ API Key tersimpan'; status.className = 'field-hint success'; }
    }

    const modelSelect = document.getElementById('geminiModel');
    if (config.gemini_model && modelSelect) modelSelect.value = config.gemini_model;

    const sysInst = document.getElementById('systemInstruction');
    if (config.system_instruction && sysInst) sysInst.value = config.system_instruction;

    const cycleDay = document.getElementById('budgetCycleDay');
    if (config.budget_cycle_day && cycleDay) {
      cycleDay.value = config.budget_cycle_day;
      selectDay(parseInt(config.budget_cycle_day));
    }

    if (config.whitelisted_users) {
      whitelistedUsers = [...config.whitelisted_users];
      renderWhitelist();
    }

  } catch (err) {
    console.error('Failed to load config:', err);
  }
}

async function saveConfig() {
  const btn = document.getElementById('saveConfigBtn');
  const statusEl = document.getElementById('saveStatus');

  const payload = {
    gemini_model: document.getElementById('geminiModel').value,
    system_instruction: document.getElementById('systemInstruction').value,
    budget_cycle_day: parseInt(document.getElementById('budgetCycleDay').value) || 1,
    whitelisted_users: whitelistedUsers.join('\n')
  };

  const token = document.getElementById('telegramToken').value.trim();
  const key = document.getElementById('geminiKey').value.trim();
  if (token) payload.telegram_token = token;
  if (key) payload.gemini_api_key = key;

  setButtonLoading(btn, true);
  statusEl?.classList.add('hidden');

  try {
    const res = await fetch(API.config, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (res.ok) {
      showStatus(statusEl, '✓ ' + data.message, 'success');
      document.getElementById('telegramToken').value = '';
      document.getElementById('geminiKey').value = '';
      setTimeout(() => loadConfig(), 1500);
    } else {
      showStatus(statusEl, '✗ ' + (data.error || 'Gagal menyimpan'), 'error');
    }
  } catch (err) {
    showStatus(statusEl, '✗ Koneksi error: ' + err.message, 'error');
  } finally {
    setButtonLoading(btn, false);
  }
}



async function testGemini() {
  const key = document.getElementById('geminiKey').value.trim();
  const model = document.getElementById('geminiModel').value;
  const statusEl = document.getElementById('geminiStatus');
  const btn = document.getElementById('testGeminiBtn');

  if (!key) {
    if (statusEl) { statusEl.textContent = '⚠ Masukkan API Key terlebih dahulu.'; statusEl.className = 'field-hint error'; }
    return;
  }

  btn.disabled = true;
  btn.textContent = '🤖 Menguji...';

  try {
    const res = await fetch(API.testGemini, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gemini_api_key: key, gemini_model: model }),
    });
    const data = await res.json();
    if (res.ok && statusEl) {
      statusEl.textContent = `✓ Berhasil! Response: "${data.response}"`;
      statusEl.className = 'field-hint success';
    } else if (statusEl) {
      statusEl.textContent = '✗ ' + data.error;
      statusEl.className = 'field-hint error';
    }
  } catch (err) {
    if (statusEl) { statusEl.textContent = '✗ Koneksi error: ' + err.message; statusEl.className = 'field-hint error'; }
  } finally {
    btn.disabled = false;
    btn.textContent = '🤖 Test API Key';
  }
}

async function testTelegram() {
  const token = document.getElementById('telegramToken').value.trim();
  const statusEl = document.getElementById('telegramStatus');
  const btn = document.getElementById('testTelegramBtn');

  if (!token) {
    if (statusEl) { statusEl.textContent = '⚠ Masukkan Token terlebih dahulu.'; statusEl.className = 'field-hint error'; }
    return;
  }

  btn.disabled = true;
  btn.textContent = '🔌 Menguji...';

  try {
    const res = await fetch(API.testTelegram, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_token: token }),
    });
    const data = await res.json();
    if (res.ok && statusEl) {
      statusEl.textContent = `✓ Bot: @${data.bot_username} (${data.bot_name})`;
      statusEl.className = 'field-hint success';
    } else if (statusEl) {
      statusEl.textContent = '✗ ' + data.error;
      statusEl.className = 'field-hint error';
    }
  } catch (err) {
    if (statusEl) { statusEl.textContent = '✗ ' + err.message; statusEl.className = 'field-hint error'; }
  } finally {
    btn.disabled = false;
    btn.textContent = '🔌 Test Koneksi';
  }
}
