import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey || supabaseServiceKey === '여기에_SERVICE_ROLE_KEY를_붙여넣으세요') {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY is not set properly. Admin features will not work.');
}

// Admin client that bypasses RLS
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});