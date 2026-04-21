/**
 * utils.js
 * Utility functions for UI and formatting
 */

/**
 * Format number to IDR currency
 */
export function formatIDR(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount || 0).replace('Rp', 'Rp ');
}

/**
 * Toggle password visibility for inputs
 */
export function toggleVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';

  // Toggle premium SVG icon
  btn.innerHTML = isPassword 
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}

/**
 * Set loading state on a button
 */
export function setButtonLoading(btn, loading) {
  if (!btn) return;
  const text = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  btn.disabled = loading;
  if (text && loader) {
    text.classList.toggle('hidden', loading);
    loader.classList.toggle('hidden', !loading);
  }
}

/**
 * Show temporary status message near an element
 */
export function showStatus(el, message, type) {
  if (!el) return;
  el.textContent = message;
  el.className = `save-status ${type}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}

/**
 * Show a floating toast notification
 */
export function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    padding: '12px 20px',
    borderRadius: '10px',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#fff',
    background: type === 'success' ? 'rgba(76,175,130,0.95)' : type === 'error' ? 'rgba(245,101,101,0.95)' : 'rgba(124,110,245,0.95)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    zIndex: '9999',
    animation: 'fadeIn 0.3s ease',
    backdropFilter: 'blur(10px)',
  });
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s ease';
    setTimeout(() => toast.remove(), 500);
  }, 3500);
}
