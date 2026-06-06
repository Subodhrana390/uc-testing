import { createBrowserClient } from '@supabase/ssr'

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions: {
        name: 'sb-admin-auth-token',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: 'lax',
      }
    }
  )
}
