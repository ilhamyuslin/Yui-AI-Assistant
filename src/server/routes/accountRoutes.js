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
        name, 
        balance: parseFloat(balance || 0), 
        icon: icon || '💰',
        updated_at: new Date().toISOString()
      }, { onConflict: 'name' })
      .select();

    if (error) throw error;
    res.json(data[0]);
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
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
