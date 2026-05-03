import { supabase } from './supabase'

import { STANDARD_CATEGORIES } from './constants'

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
  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return { success: true, user: data.user }
  },
  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) throw error
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // 1. Ambil list budget
    const { data: budgetList, error: budgetError } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', user.id)
      .order('category', { ascending: true })

    if (budgetError) throw budgetError

    // 2. Ambil total pengeluaran per kategori di range ini
    let txQuery = supabase
      .from('transactions')
      .select('category, amount')
      .eq('transaction_type', 'Expense')

    if (startDate) txQuery = txQuery.gte('transaction_date', startDate)
    if (endDate) txQuery = txQuery.lte('transaction_date', endDate)
    txQuery = txQuery.eq('user_id', user.id)

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const [txRes, bgRes] = await Promise.all([
      supabase.from('transactions').select('category').eq('user_id', user.id),
      supabase.from('budgets').select('category').eq('user_id', user.id)
    ])

    const txCats = txRes.data ? txRes.data.map(d => d.category) : []
    const bgCats = bgRes.data ? bgRes.data.map(d => d.category) : []

    let unique = [...new Set([...txCats, ...bgCats])].filter(Boolean).sort()
    
    // Fallback to standard categories if no custom ones found
    if (unique.length === 0) {
      unique = STANDARD_CATEGORIES
    }

    return { data: unique }
  }
}

// ─── Transactions ─────────────────────────────────────────────
export const transactionApi = {
  getAll: async (params) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (params.startDate) query = query.gte('transaction_date', params.startDate)
    if (params.endDate) query = query.lte('transaction_date', params.endDate)
    if (params.transaction_type) query = query.eq('transaction_type', params.transaction_type)
    if (params.category && params.category.length > 0) query = query.in('category', params.category)

    const { data, error } = await query
    if (error) throw error
    return { data }
  },

  update: async (id, data) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: updated, error } = await supabase
      .from('transactions')
      .update(data)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return { data: updated }
  },

  delete: async (id) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // 1. Get transaction details for reversal
    const { data: tx, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !tx) throw new Error('Transaksi tidak ditemukan.')

    const amount = Number(tx.amount)

    // 2. Fetch all accounts for case-insensitive matching
    const { data: allAccounts } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)

    const findAccount = (name) => {
      if (!name) return null;
      return allAccounts?.find(a => a.name.toLowerCase().trim() === name.toLowerCase().trim());
    }

    const sourceAcc = findAccount(tx.source_of_fund)
    const destAcc = findAccount(tx.destination_account)

    // 3. Revert account balances
    if (tx.transaction_type === 'Income' && sourceAcc) {
      await supabase.from('accounts')
        .update({ balance: Number(sourceAcc.balance) - amount, updated_at: new Date().toISOString() })
        .eq('id', sourceAcc.id)
    } 
    else if (tx.transaction_type === 'Expense' && sourceAcc) {
      await supabase.from('accounts')
        .update({ balance: Number(sourceAcc.balance) + amount, updated_at: new Date().toISOString() })
        .eq('id', sourceAcc.id)
    }
    else if (tx.transaction_type === 'Transfer' && sourceAcc && destAcc) {
      // Revert Transfer: Source +, Destination -
      await Promise.all([
        supabase.from('accounts')
          .update({ balance: Number(sourceAcc.balance) + amount, updated_at: new Date().toISOString() })
          .eq('id', sourceAcc.id),
        supabase.from('accounts')
          .update({ balance: Number(destAcc.balance) - amount, updated_at: new Date().toISOString() })
          .eq('id', destAcc.id)
      ])
    }

    // 4. Delete the transaction record
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
    return { success: true }
  },

  create: async (data) => {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    const { data: result, error } = await supabase.rpc('record_manual_transaction', {
      p_user_id: user.id,
      p_type: data.transaction_type,
      p_amount: data.amount,
      p_item_name: data.item_name,
      p_category: data.category,
      p_source_account: data.source_of_fund,
      p_notes: data.transaction_notes,
      p_date: data.transaction_date
    })

    if (error) throw error
    return { data: result }
  },
}

// ─── Config ───────────────────────────────────────────────────
export const configApi = {
  get: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('ai_assistant_config')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) throw error

    // If no config exists for this user, return default or empty
    if (!data) {
      return {
        data: {
          gemini_api_key: '',
          gemini_model: 'gemini-3.1-flash-lite',
          system_instruction: '',
          _has_gemini_key: false
        }
      }
    }

    // Add flags for UI compatibility
    return {
      data: {
        ...data,
        _has_gemini_key: !!data.gemini_api_key
      }
    }
  },

  update: async (updates) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('ai_assistant_config')
      .upsert({ ...updates, user_id: user.id }, { onConflict: 'user_id' })
      .select()
      .single()

    if (error) throw error
    return { data }
  },

  getCycle: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('profiles')
      .select('budget_cycle_day')
      .eq('id', user.id)
      .single()

    if (error) throw error
    return { data: { payDay: data.budget_cycle_day } }
  },

  testGemini: () => Promise.resolve({ data: { response: 'Test mode: Direct Supabase can not test Gemini directly. Please use API server.' } }),
}

// ─── Whitelist ────────────────────────────────────────────────
export const whitelistApi = {
  get: configApi.get,
}

// ─── Accounts ─────────────────────────────────────────────────
export const accountApi = {
  getAll: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
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
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    const { data: result, error } = await supabase
      .from('accounts')
      .insert({
        user_id: user.id,
        name: data.name,
        balance: data.balance,
        icon: data.icon
      })
      .select()
      .single()

    if (error) throw error
    return { data: result }
  },

  update: async (id, data) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: updated, error } = await supabase
      .from('accounts')
      .update(data)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return { data: updated }
  },

  delete: async (id) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

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

// ─── Investments ──────────────────────────────────────────────
export const investmentApi = {
  getAll: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', user.id)
      .order('purchase_date', { ascending: false })

    if (error) throw error

    const totalPortfolio = (data || []).reduce((acc, inv) => {
      return acc + Number(inv.current_value ?? inv.purchase_value)
    }, 0)

    const totalCost = (data || []).reduce((acc, inv) => acc + Number(inv.purchase_value), 0)

    return { data: { investments: data || [], totalPortfolio, totalCost } }
  },

  create: async (payload) => {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('investments')
      .insert([{ ...payload, user_id: user.id }])
      .select()
      .single()

    if (error) throw error
    return { data }
  },

  update: async (id, payload) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('investments')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return { data }
  },

  delete: async (id) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase
      .from('investments')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
    return { success: true }
  },
}

// ─── Goals ────────────────────────────────────────────────────
export const goalApi = {
  getAll: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data: data || [] }
  },

  create: async (payload) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('goals')
      .insert([{ ...payload, user_id: user.id }])
      .select()
      .single()

    if (error) throw error
    return { data }
  },

  update: async (id, payload) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('goals')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return { data }
  },

  delete: async (id) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
    return { success: true }
  },
}
