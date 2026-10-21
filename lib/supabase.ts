import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xkiipifalchrzbogashm.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl) {
  console.error('Falta NEXT_PUBLIC_SUPABASE_URL en las variables de entorno');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
