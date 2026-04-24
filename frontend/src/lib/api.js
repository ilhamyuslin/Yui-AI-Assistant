import axios from 'axios'

/**
 * Axios instance pre-configured for the AI Assistant API.
 * Automatically redirects to login on 401.
 */
export const api = axios.create({
  baseURL: '/',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ─── Auth ─────────────────────────────────────────────────────
export const authApi = {
  login: (password) => api.post('/auth/login', { password }),
  logout: () => api.post('/auth/logout'),
  check: () => api.get('/auth/check'),
}

// ─── Stats / Dashboard ─────────────────────────────────────────
export const statsApi = {
  get: (startDate, endDate, category = []) =>
    api.get('/api/transactions/stats', { params: { startDate, endDate, category } }),
  getBudgets: (params) =>
    api.get('/api/transactions/budgets', { params }),
  updateBudget: (data) =>
    api.post('/api/transactions/budgets', data),
  deleteBudget: (category) =>
    api.delete(`/api/transactions/budgets/${encodeURIComponent(category)}`),
  renameCategory: (oldName, newName) =>
    api.put('/api/transactions/categories/rename', { oldName, newName }),
  getCategories: () =>
    api.get('/api/transactions/categories'),
}

// ─── Transactions ─────────────────────────────────────────────
export const transactionApi = {
  getAll: (params) => api.get('/api/transactions', { params }),
  update: (id, data) => api.put(`/api/transactions/${id}`, data),
  delete: (id) => api.delete(`/api/transactions/${id}`),
}

// ─── Bot / Status ─────────────────────────────────────────────
export const botApi = {
  getStatus: () => api.get('/api/config/status'),
  start: () => api.post('/api/config/status/start'),
  stop: () => api.post('/api/config/status/stop'),
  restart: () => api.post('/api/config/status/restart'),
}

// ─── Config ───────────────────────────────────────────────────
export const configApi = {
  get: () => api.get('/api/config'),
  update: (data) => api.post('/api/config', data),
  testGemini: (data) => api.post('/api/config/test-gemini', data),
  testTelegram: (data) => api.post('/api/config/test-telegram', data),
  getCycle: () => api.get('/api/config/cycle'),
}

// ─── Whitelist (via config body) ──────────────────────────────
export const whitelistApi = {
  // whitelist is managed via config.whitelisted_users field
  get: () => api.get('/api/config'),
}

// ─── Accounts ─────────────────────────────────────────────────
export const accountApi = {
  getAll: () => api.get('/api/accounts'),
  create: (data) => api.post('/api/accounts', data),
  update: (id, data) => api.put(`/api/accounts/${id}`, data),
  delete: (id) => api.delete(`/api/accounts/${id}`),
}
