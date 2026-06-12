// FieldFinder/supabaseClient.tsx
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lsquxrvufehselooyenj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_TANOMAeqEQwjo0PYtjbn_Q_WkdLbwyb';

// 1. Export as a Named Export
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Export as a Default Export (Defensive programming)
export default supabase;
