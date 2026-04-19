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
  }).format(amount || 0);
}

/**
 * Toggle password visibility for inputs
 */
export function toggleVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁';
  }
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
