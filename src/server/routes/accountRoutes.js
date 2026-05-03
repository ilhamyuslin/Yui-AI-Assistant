const express = require('express');
const router = express.Router();
const { supabase } = require('../../storage/supabaseClient');

/**
 * GET /api/accounts
 * Fetch all financial accounts and calculate total assets.
 */
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', req.user.id)
      .order('name', { ascending: true });

    if (error) throw error;
    
    const totalAssets = data.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);
    res.json({ accounts: data, totalAssets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/accounts
 * Create or update an account balance/info.
 */
router.post('/', async (req, res) => {
  const { name, balance, icon } = req.body;
  
  if (!name) return res.status(400).json({ error: 'Nama akun wajib diisi.' });

  try {
    const { data, error } = await supabase
      .from('accounts')
      .upsert({ 
        user_id: req.user.id,
        name, 
        balance: parseFloat(balance || 0), 
        icon: icon || '💰',
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, name' })
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/accounts/:id
 * Update an existing account and sync transactions if name changes.
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, balance, icon } = req.body;

  try {
    // 1. Get old account info to check for name change
    const { data: oldAccount, error: fetchError } = await supabase
      .from('accounts')
      .select('name')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError) throw fetchError;

    const oldName = oldAccount.name;

    // 2. Update account table
    const { data: updatedAccount, error: updateError } = await supabase
      .from('accounts')
      .update({ 
        name, 
        balance: parseFloat(balance || 0), 
        icon: icon || '💰',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select();

    if (updateError) throw updateError;

    // 3. If name changed, update all transactions source_of_fund
    if (oldName !== name) {
      const { error: txError } = await supabase
        .from('transactions')
        .update({ source_of_fund: name })
        .eq('user_id', req.user.id)
        .eq('source_of_fund', oldName);
      
      if (txError) console.error('Failed to sync transactions during account rename:', txError);
    }

    res.json(updatedAccount[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/accounts/:id
 * Delete an account.
 */
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
