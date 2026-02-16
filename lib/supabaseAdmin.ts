import { createClient } from '@supabase/supabase-js';
import type { Database } from './types/database';

/**
 * Server-only Supabase client using the service role key.
 * Bypasses RLS – use only in server actions/API routes after validating the user.
 * Never expose SUPABASE_SERVICE_ROLE_KEY to the client.
 */
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL (server env)'
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false }
  });
}
