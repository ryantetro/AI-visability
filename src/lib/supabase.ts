import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _serviceClient: SupabaseClient | null = null;
let _browserClient: SupabaseClient | null = null;

/** Server-side admin client (uses service role key for DB operations). */
export function getSupabaseClient(): SupabaseClient {
  if (_serviceClient) return _serviceClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  _serviceClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _serviceClient;
}

/** Anon client for auth flows (uses public anon key). */
export function getSupabaseAnonClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Browser client for future client-side auth interactions. */
export function createBrowserSupabaseClient(): SupabaseClient {
  if (_browserClient) return _browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  _browserClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _browserClient;
}

/** Route-handler auth client. Wrapped for a cleaner auth interface. */
export function createRouteHandlerSupabaseClient(): SupabaseClient {
  return getSupabaseAnonClient();
}

/** Middleware auth client. Wrapped for a cleaner auth interface. */
export function createMiddlewareSupabaseClient(): SupabaseClient {
  return getSupabaseAnonClient();
}
