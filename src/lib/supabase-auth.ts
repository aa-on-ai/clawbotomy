import { createClient } from '@supabase/supabase-js';

/**
 * Auth-aware Supabase client for use in browser components.
 * Separate from the existing supabase.ts to avoid modifying shared code.
 */
export function createAuthClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );
}
