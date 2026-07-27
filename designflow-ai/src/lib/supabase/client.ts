import { createBrowserClient } from "@supabase/ssr";

/**
 * The Supabase client for anything running in the browser — sign-in forms,
 * client-side session checks. Safe to use the public "anon" key here; access
 * is still enforced server-side via requireOrgScope() and, longer-term, RLS.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
