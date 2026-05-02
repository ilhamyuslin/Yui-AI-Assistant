import { supabase } from '@/lib/supabase'

const API_BASE = import.meta.env.VITE_API_URL || ''

/**
 * Helper: Generic fetch wrapper with Supabase JWT auth.
 */
async function apiFetch(path, options = {}) {
  // Get current Supabase session for JWT token
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token || ''

  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    ...options,
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`)
  }

  return data
}

export const chatApi = {
  /**
   * Send a user message to AI.
   * Returns: { type: 'TEXT'|'TOOL_RESULT'|'PENDING_TX', text?: string, data?: object }
   */
  send: (message) =>
    apiFetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  /**
   * Confirm and save a pending transaction.
   * Returns: { success: true, message: string, warning?: string }
   */
  confirm: (txData) =>
    apiFetch('/api/chat/confirm', {
      method: 'POST',
      body: JSON.stringify({ txData }),
    }),

  /**
   * Cancel a pending transaction.
   * Returns: { success: true }
   */
  cancel: () =>
    apiFetch('/api/chat/cancel', {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  /**
   * Clear all conversation history.
   * Returns: { success: true }
   */
  clear: () =>
    apiFetch('/api/chat/clear', {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  /**
   * Fetch existing chat history from database
   */
  getChatHistory: () =>
    apiFetch('/api/chat/history'),

  /**
   * Confirm and save a pending account upsert.
   */
  confirmAccount: (accountData) =>
    apiFetch('/api/chat/confirm-account', {
      method: 'POST',
      body: JSON.stringify({ accountData }),
    }),

  /**
   * Confirm and delete an account.
   */
  deleteAccount: (name, id) =>
    apiFetch('/api/chat/delete-account', {
      method: 'POST',
      body: JSON.stringify({ name, id }),
    }),
    
  confirmBudget: (budgetData) =>
    apiFetch('/api/chat/confirm-budget', {
      method: 'POST',
      body: JSON.stringify({ budgetData }),
    }),

  deleteBudget: (category) =>
    apiFetch('/api/chat/delete-budget', {
      method: 'POST',
      body: JSON.stringify({ category }),
    }),
}
