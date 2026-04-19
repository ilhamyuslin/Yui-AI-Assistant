/**
 * auth.js
 * handles authentication, login, and logout
 */

import { API } from './api.js';
import { setButtonLoading } from './utils.js';

let onLoginSuccess = null;

export function initAuth(callbacks) {
  onLoginSuccess = callbacks.onLoginSuccess;

  const form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', handleLogin);
  }

  // Setup toggle visibility for login
  const toggleBtn = document.querySelector('.toggle-visibility');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      import('./utils.js').then(utils => utils.toggleVisibility('loginPassword', toggleBtn));
    });
  }
}

export async function checkAuth() {
  try {
    const res = await fetch(API.check);
    const { authenticated } = await res.json();
    return authenticated;
  } catch (_) {
    return false;
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');
  const errEl = document.getElementById('loginError');

  setButtonLoading(btn, true);
  errEl.classList.add('hidden');

  try {
    const res = await fetch(API.login, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();

    if (res.ok) {
      if (onLoginSuccess) onLoginSuccess();
    } else {
      errEl.textContent = data.error || 'Password salah.';
      errEl.classList.remove('hidden');
      
      // Shake animation
      document.querySelector('.login-card')?.animate([
        { transform: 'translateX(-6px)' },
        { transform: 'translateX(6px)' },
        { transform: 'translateX(-4px)' },
        { transform: 'translateX(4px)' },
        { transform: 'translateX(0)' },
      ], { duration: 300 });
    }
  } catch (err) {
    errEl.textContent = 'Koneksi gagal. Pastikan server berjalan.';
    errEl.classList.remove('hidden');
  } finally {
    setButtonLoading(btn, false);
  }
}

export async function logout() {
  await fetch(API.logout, { method: 'POST' });
  location.reload(); // Hard reload is the cleanest way after logout
}
