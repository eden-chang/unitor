/**
 * Supabase client singleton.
 *
 * Used for: magic-link sign-in (`signInWithOtp`), session lifecycle, and
 * reading the access token to attach to backend API calls. All actual
 * data reads/writes go through the FastAPI backend — Supabase is the
 * auth provider, not a direct data source from the frontend.
 *
 * The anon key is safe to ship to the browser: RLS is the security gate
 * and the anon role has the policies we want. Service-role keys must
 * NEVER appear here.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail loud at boot — easier to debug than a mysterious 401 later.
  // In tests this throws too; provide stubs via .env.test if needed.
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Copy frontend/.env.example to frontend/.env and fill them in.",
  );
}

export const supabase: SupabaseClient = createClient(url, anonKey, {
  auth: {
    // Persist across reloads so the user stays signed in.
    persistSession: true,
    autoRefreshToken: true,
    // We use magic-link flow → the callback page reads the hash params.
    detectSessionInUrl: true,
  },
});
