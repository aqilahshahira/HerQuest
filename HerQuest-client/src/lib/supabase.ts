import { createClient } from '@supabase/supabase-js';

export function getBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    || 'https://gyqbuwcmhkkydfcgarhw.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
    || 'sb_publishable_uoue5tObd75d9S3KRqqJhA_frxWHRcQ';
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}
