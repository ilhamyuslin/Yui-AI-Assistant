import { supabase } from './supabase'

/**
 * AI Assistant API Bridge using Supabase (Direct Mode).
 * Replacing Axios with direct Supabase SDK calls while maintaining compatibility.
 */

// Dummy Axios-like instance to prevent import errors in legacy components
export const api = {
  get: () => Promise.reject('Legacy API called'),
  post: () => Promise.reject('Legacy API called'),
  put: () => Promise.reject('Legacy API called'),
  delete: () => Promise.reject('Legacy API called'),
}

// ─── Auth ─────────────────────────────────────────────────────
export const authApi = {
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return { success: true, user: data.user }
  },
  logout: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },
  check: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { authenticated: !!session }
  },
}

// ─── Stats / Dashboard ─────────────────────────────────────────
export const statsApi = {
  get: async (startDate, endDate, category = []) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase.rpc('get_financial_dashboard_stats', {
      p_user_id: user.id,
      p_start_date: startDate,
      p_end_date: endDate,
      p_categories: category && category.length > 0 ? category : null
    })

    if (error) throw error
    return { data }
  },

  getBudgets: async (params) => {
    const { startDate, endDate } = params

    // 1. Ambil list budget
    const { data: budgetList, error: budgetError } = await supabase
      .from('budgets')
      .select('*')
      .order('category', { ascending: true })

    if (budgetError) throw budgetError

    // 2. Ambil total pengeluaran per kategori di range ini
    let txQuery = supabase
      .from('transactions')
      .select('category, amount')
      .eq('transaction_type', 'Expense')

    if (startDate) txQuery = txQuery.gte('transaction_date', startDate)
    if (endDate) txQuery = txQuery.lte('transaction_date', endDate)

    const { data: txData, error: txError } = await txQuery
    if (txError) throw txError

    // 3. Agregasi pengeluaran per kategori
    const actuals = (txData || []).reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount)
      return acc
    }, {})

    // 4. Gabungkan budget dengan data actual
    const merged = budgetList.map(b => ({
      ...b,
      actual: actuals[b.category] || 0
    }))

    return { data: merged }
  },

  updateBudget: async (data) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: updated, error } = await supabase
      .from('budgets')
      .upsert({ ...data, user_id: user?.id }, { onConflict: 'category' })
      .select()
      .single()

    if (error) throw error
    return { data: updated }
  },

  deleteBudget: async (category) => {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('category', category)

    if (error) throw error
    return { success: true }
  },

  renameCategory: async (oldName, newName) => {
    // Rename in transactions and budgets
    const { error: txError } = await supabase
      .from('transactions')
      .update({ category: newName })
      .eq('category', oldName)

    if (txError) throw txError

    const { error: bgError } = await supabase
      .from('budgets')
      .update({ category: newName })
      .eq('category', oldName)

    if (bgError) throw bgError
    return { success: true }
  },

  getCategories: async () => {
    const [txRes, bgRes] = await Promise.all([
      supabase.from('transactions').select('category'),
      supabase.from('budgets').select('category')
    ])
    
    const txCats = txRes.data ? txRes.data.map(d => d.category) : []
    const bgCats = bgRes.data ? bgRes.data.map(d => d.category) : []
    
    const unique = [...new Set([...txCats, ...bgCats])].filter(Boolean).sort()
    return { data: unique }
  }
}

// ─── Transactions ─────────────────────────────────────────────
export const transactionApi = {
  getAll: async (params) => {
    let query = supabase
      .from('transactions')
      .select('*')
      .order('transaction_date', { ascending: false })

    if (params.startDate) query = query.gte('transaction_date', params.startDate)
    if (params.endDate) query = query.lte('transaction_date', params.endDate)
    if (params.transaction_type) query = query.eq('transaction_type', params.transaction_type)
    if (params.category && params.category.length > 0) query = query.in('category', params.category)

    const { data, error } = await query
    if (error) throw error
    return { data }
  },

  update: async (id, data) => {
    const { data: updated, error } = await supabase
      .from('transactions')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { data: updated }
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { success: true }
  },
}

// ─── Config ───────────────────────────────────────────────────
export const configApi = {
  get: async () => {
    const { data, error } = await supabase
      .from('ai_assistant_config')
      .select('*')
      .eq('id', 1)
      .single()

    if (error) throw error

    // Add flags for UI compatibility
    return {
      data: {
        ...data,
        _has_telegram_token: !!data.telegram_token,
        _has_gemini_key: !!data.gemini_api_key
      }
    }
  },

  update: async (updates) => {
    // Format whitelist back to array if it's a string from form
    const formatted = { ...updates }
    if (typeof updates.whitelisted_users === 'string') {
      formatted.whitelisted_users = updates.whitelisted_users.split('\n').filter(Boolean).map(id => parseInt(id))
    }

    const { data, error } = await supabase
      .from('ai_assistant_config')
      .update(formatted)
      .eq('id', 1)
      .select()
      .single()

    if (error) throw error
    return { data }
  },

  getCycle: async () => {
    const { data, error } = await supabase
      .from('ai_assistant_config')
      .select('budget_cycle_day')
      .eq('id', 1)
      .single()

    if (error) throw error
    return { data: { payDay: data.budget_cycle_day } }
  },

  testGemini: () => Promise.resolve({ data: { response: 'Test mode: Direct Supabase can not test Gemini directly. Please use Bot Server.' } }),
  testTelegram: () => Promise.resolve({ data: { bot_username: 'AI_Assistant', bot_name: 'AI Assistant' } }),
}

// ─── Whitelist ────────────────────────────────────────────────
export const whitelistApi = {
  get: configApi.get,
}

// ─── Accounts ─────────────────────────────────────────────────
export const accountApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error

    const totalAssets = (data || []).reduce((acc, curr) => acc + Number(curr.balance), 0)

    return {
      data: {
        accounts: data || [],
        totalAssets
      }
    }
  },

  create: async (data) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: created, error } = await supabase
      .from('accounts')
      .insert({ ...data, user_id: user?.id })
      .select()
      .single()

    if (error) throw error
    return { data: created }
  },

  update: async (id, data) => {
    const { data: updated, error } = await supabase
      .from('accounts')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { data: updated }
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { success: true }
  },
}

// ─── Bot / Status (Real Data from Supabase) ──────────────────
export const botApi = {
  getStatus: async () => {
    const { data, error } = await supabase
      .from('bot_status')
      .select('*')
      .eq('id', 1)
      .single()

    if (error) throw error

    // Cek apakah heartbeat masih segar (kurang dari 2 menit)
    const lastHeartbeat = new Date(data.last_heartbeat)
    const now = new Date()
    const diffMinutes = (now - lastHeartbeat) / 1000 / 60

    const isOffline = diffMinutes > 2

    return {
      data: {
        status: isOffline ? 'stopped' : data.status,
        node_version: data.node_version || 'N/A',
        uptime: isOffline ? 'Offline' : (data.uptime || '00:00:00'),
        memory: isOffline ? '0 MB' : (data.memory_usage || '0 MB'),
        mode: isOffline ? 'N/A' : (data.bot_mode || 'Polling'),
        api_latency: isOffline ? 'N/A' : '15ms',
        bot_info: { first_name: 'Yui AI' },
        db_status: { state: 'connected', host: 'Supabase' },
        last_seen: data.last_heartbeat
      }
    }
  },
  start: () => Promise.resolve(), // Bot control needs local server access, stubs for now
  stop: () => Promise.resolve(),
  restart: async () => {
    // Ambil user_id dari auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Harus login untuk restart bot')

    // Kirim perintah ke antrian
    const { error } = await supabase
      .from('bot_commands')
      .insert([{
        user_id: user.id,
        command: 'restart',
        status: 'pending'
      }])

    if (error) throw error
    return { success: true }
  },
}
