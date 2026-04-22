/**
 * supabaseClient.js
 * Singleton Supabase client shared across all modules.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[Supabase] ERROR: SUPABASE_URL or SUPABASE_ANON_KEY is missing from Environment Variables!');
}

const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder'
);

module.exports = { supabase };
