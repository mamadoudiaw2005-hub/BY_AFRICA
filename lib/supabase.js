import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vgaifljtaocvnifiyrsg.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_7oHChmVbT7XB7A4FxJNWOA_69FN41xh';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
