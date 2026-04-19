/**
 * config.js
 * handles bot configuration, whitelist, and API tests
 */

import { API, PRESETS } from './api.js';
import { setButtonLoading, showStatus, showToast, toggleVisibility } from './utils.js';

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
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('onclick')?.match(/'(.*?)'/)[1];
      if (type && PRESETS[type]) {
        document.getElementById('systemInstruction').value = PRESETS[type];
      }
    });
  });

  // Setup Save buttons
  document.getElementById('saveConfigBtn')?.addEventListener('click', saveConfig);
  document.querySelector('#tab-whitelist .btn-primary')?.addEventListener('click', saveWhitelist);
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

    const whitelist = document.getElementById('whitelistIds');
    if (config.whitelisted_users && whitelist) whitelist.value = config.whitelisted_users.join('\n');

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

async function saveWhitelist() {
  const ids = document.getElementById('whitelistIds').value;
  try {
    const res = await fetch(API.config, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whitelisted_users: ids }),
    });
    const data = await res.json();
    if (res.ok) showToast('✓ Whitelist tersimpan!', 'success');
    else showToast('✗ ' + (data.error || 'Gagal'), 'error');
  } catch (err) {
    showToast('✗ ' + err.message, 'error');
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
