/**
 * accountStore.js
 * Manages database operations for accounts (bank accounts, e-wallets, cash).
 */

const { supabase } = require('./supabaseClient');

/**
 * Gets all accounts with their current balances.
 */
async function getAccounts(userId) {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId) // SECURITY: Only user's accounts
      .order('name', { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err) {
    console.error('[AccountStore] Error fetching accounts:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Adds or updates an account.
 * @param {Object} accountData - { name, balance, type, id (optional) }
 */
async function upsertAccount(accountData) {
  try {
    // Samakan dengan pola accountRoutes.js yang sudah jalan di Dashboard
    const payload = {
      name: accountData.name,
      balance: parseFloat(accountData.balance || 0),
      icon: accountData.icon || '💰',
      updated_at: new Date().toISOString(),
      user_id: accountData.user_id // Mandatory from context
    };

    const { data, error } = await supabase
      .from('accounts')
      .upsert(payload, { onConflict: 'user_id,name' }) // Penting: Handle duplicate name per user
      .select()
      .single();

    if (error) {
      console.error('[AccountStore] Supabase Error:', error);
      throw error;
    }
    return { success: true, data: data, message: 'Akun berhasil disimpan!' };
  } catch (err) {
    console.error('[AccountStore] Error upserting account:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Deletes an account by name or ID.
 * @param {Object} criteria - { id, name }
 */
async function deleteAccount(criteria, userId) {
  try {
    let query = supabase.from('accounts').delete().eq('user_id', userId);
    
    if (criteria.id) {
      query = query.eq('id', criteria.id);
    } else if (criteria.name) {
      query = query.eq('name', criteria.name);
    } else {
      throw new Error('ID atau Nama akun diperlukan untuk menghapus.');
    }

    const { error } = await query;
    if (error) throw error;
    
    return { success: true, message: 'Akun berhasil dihapus!' };
  } catch (err) {
    console.error('[AccountStore] Error deleting account:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  getAccounts,
  upsertAccount,
  deleteAccount
};
