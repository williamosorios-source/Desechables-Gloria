import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xkiipifalchrzbogashm.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_mfuG0lPYq6gYDbf6SD_4QQ_g26vGNB3';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
