/**
 * expenseStore.js
 * Manages database operations for the transactions table in Supabase.
 */

const { supabase } = require('./supabaseClient');

/**
 * Saves a validated transaction to Supabase and updates account balances.
 * @param {Object} data - The transaction data.
 * @returns {Promise<{ success: boolean, data: any, balanceUpdated: boolean, warning: string, error: any }>}
 */
async function saveTransaction(data) {
  try {
    const amount = parseFloat(data.amount);

    // 1. Insert transaction
    const { error: txError, data: insertedData } = await supabase
      .from('transactions')
      .insert([{
        user_id: process.env.DEFAULT_USER_ID,
        message_id: data.message_id,
        transaction_type: data.transaction_type, // 'Expense', 'Income', or 'Transfer'
        amount: amount,
        item_name: data.item_name,
        category: data.category,
        custom_category: data.custom_category || null,
        source_of_fund: data.source_of_fund,
        destination_account: data.destination_account || null,
        transaction_notes: data.transaction_notes || '',
        transaction_date: data.transaction_date || new Date().toISOString()
      }])
      .select();

    if (txError) throw txError;
    const tx = insertedData[0];

    // 2. Logic for Balance Sync
    let balanceUpdated = false;
    let warning = null;

    const accountsNeeded = [tx.source_of_fund];
    if (tx.transaction_type === 'Transfer' && tx.destination_account) {
      accountsNeeded.push(tx.destination_account);
    }

    // Fetch all user accounts to perform case-insensitive matching
    const { data: allAccounts, error: accError } = await supabase
      .from('accounts')
      .select('name, balance')
      .eq('user_id', process.env.DEFAULT_USER_ID);

    if (accError) throw accError;

    // Helper to find account case-insensitively
    const findAccount = (name) => {
      if (!name) return null;
      return allAccounts.find(a => a.name.toLowerCase().trim() === name.toLowerCase().trim());
    };

    const sourceAcc = findAccount(tx.source_of_fund);
    const destAcc = tx.destination_account ? findAccount(tx.destination_account) : null;

    // Map to actual DB names for the updates below
    const sourceName = sourceAcc ? sourceAcc.name : tx.source_of_fund;
    const destName = destAcc ? destAcc.name : tx.destination_account;

    if (!sourceAcc) {
      warning = `Akun asal "${tx.source_of_fund}" belum terdaftar.`;
    } else if (tx.transaction_type === 'Transfer' && !destAcc) {
      warning = `Akun tujuan "${tx.destination_account}" belum terdaftar.`;
    } else {
      // Execute Updates
      if (tx.transaction_type === 'Income') {
        await supabase.from('accounts').update({
          balance: parseFloat(sourceAcc.balance) + amount,
          updated_at: new Date().toISOString()
        }).eq('name', sourceName);
        balanceUpdated = true;
      }
      else if (tx.transaction_type === 'Expense') {
        await supabase.from('accounts').update({
          balance: parseFloat(sourceAcc.balance) - amount,
          updated_at: new Date().toISOString()
        }).eq('name', sourceName);
        balanceUpdated = true;
      }
      else if (tx.transaction_type === 'Transfer' && destAcc) {
        // Atomic update for Source
        await supabase.from('accounts').update({
          balance: parseFloat(sourceAcc.balance) - amount,
          updated_at: new Date().toISOString()
        }).eq('name', sourceName);
        // Atomic update for Destination
        await supabase.from('accounts').update({
          balance: parseFloat(destAcc.balance) + amount,
          updated_at: new Date().toISOString()
        }).eq('name', destName);
        balanceUpdated = true;
      }
    }

    return {
      success: true,
      data: tx,
      balanceUpdated,
      warning: warning ? `⚠️ Saldo tidak diperbarui: ${warning}` : null
    };
  } catch (err) {
    console.error('[ExpenseStore] Error saving transaction:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Deletes a transaction and reverts the balance changes.
 * @param {string} id - The transaction ID.
 * @returns {Promise<{ success: boolean, error: any }>}
 */
async function deleteTransaction(id) {
  try {
    // 1. Fetch transaction details first
    const { data: tx, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!tx) throw new Error('Transaction not found');

    const amount = parseFloat(tx.amount);

    // 2. Revert balances
    const accountsNeeded = [tx.source_of_fund];
    if (tx.transaction_type === 'Transfer' && tx.destination_account) {
      accountsNeeded.push(tx.destination_account);
    }

    // Fetch all user accounts to perform case-insensitive matching
    const { data: allAccounts, error: accError } = await supabase
      .from('accounts')
      .select('name, balance')
      .eq('user_id', tx.user_id);

    if (accError) throw accError;

    // Helper to find account case-insensitively
    const findAccount = (name) => {
      if (!name) return null;
      return allAccounts.find(a => a.name.toLowerCase().trim() === name.toLowerCase().trim());
    };

    const sourceAcc = findAccount(tx.source_of_fund);
    const destAcc = tx.destination_account ? findAccount(tx.destination_account) : null;

    // Map to actual DB names for the updates below
    const sourceName = sourceAcc ? sourceAcc.name : tx.source_of_fund;
    const destName = destAcc ? destAcc.name : tx.destination_account;

    if (sourceAcc) {
      if (tx.transaction_type === 'Income') {
        // Reverse Income: Subtract from balance
        const { error: updError } = await supabase.from('accounts').update({
          balance: parseFloat(sourceAcc.balance) - amount,
          updated_at: new Date().toISOString()
        }).eq('name', sourceName);
        if (updError) throw updError;
      }
      else if (tx.transaction_type === 'Expense') {
        // Reverse Expense: Add back to balance
        const { error: updError } = await supabase.from('accounts').update({
          balance: parseFloat(sourceAcc.balance) + amount,
          updated_at: new Date().toISOString()
        }).eq('name', sourceName);
        if (updError) throw updError;
      }
      else if (tx.transaction_type === 'Transfer' && destAcc) {
        // Reverse Transfer: Source +, Destination -
        const { error: updSrcError } = await supabase.from('accounts').update({
          balance: parseFloat(sourceAcc.balance) + amount,
          updated_at: new Date().toISOString()
        }).eq('name', sourceName);
        if (updSrcError) throw updSrcError;

        const { error: updDestError } = await supabase.from('accounts').update({
          balance: parseFloat(destAcc.balance) - amount,
          updated_at: new Date().toISOString()
        }).eq('name', destName);
        if (updDestError) throw updDestError;
      }
    }

    // 3. Delete the transaction record
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return { success: true };
  } catch (err) {
    console.error('[ExpenseStore] Error deleting transaction:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { saveTransaction, deleteTransaction };
