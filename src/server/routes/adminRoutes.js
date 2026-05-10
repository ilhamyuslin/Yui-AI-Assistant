const express = require('express');
const router = express.Router();
const { supabase } = require('../../storage/supabaseClient');

/**
 * GET /api/admin/users
 * List all users and their profile information.
 */
router.get('/users', async (req, res) => {
  try {
    // 1. Fetch profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*');

    if (profileError) throw profileError;

    // 2. Fetch auth users info (requires service_role)
    // We want to combine profile data with auth data (like email and last sign in)
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('[Admin] Error fetching auth users:', authError);
      // Fallback to profiles only if auth list fails
      return res.json({ users: profiles });
    }

    // Merge data
    const mergedUsers = profiles.map(profile => {
      const authUser = users.find(u => u.id === profile.id);
      return {
        ...profile,
        email: authUser?.email || profile.email, // Fallback to profile email if auth missing
        last_sign_in_at: authUser?.last_sign_in_at,
        confirmed_at: authUser?.confirmed_at
      };
    });

    res.json({ users: mergedUsers });
  } catch (error) {
    console.error('[Admin] Error listing users:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/invite
 * Invite a new user by email.
 */
router.post('/invite', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email);
    if (error) throw error;
    res.json({ success: true, user: data.user });
  } catch (error) {
    console.error('[Admin] Error inviting user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Permanently delete a user account.
 */
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  
  // Prevent self-deletion if needed, but we trust the admin
  if (req.user?.id === id) {
    return res.status(400).json({ error: 'You cannot delete your own admin account.' });
  }

  try {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) throw error;
    
    // Profile deletion is usually handled by DB cascade if setup, 
    // but let's be safe and delete it manually if it exists.
    await supabase.from('profiles').delete().eq('id', id);

    res.json({ success: true });
  } catch (error) {
    console.error('[Admin] Error deleting user:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
