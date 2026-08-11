/**
 * supabase.ts — compatibility re-export
 *
 * The project uses a custom Express backend instead of a direct Supabase
 * connection. All auth/data calls go through the custom client in
 * @/integrations/supabase/client, which proxies to the local API server.
 *
 * This file re-exports that client so any code importing from "@/lib/supabase"
 * continues to work without hitting the real Supabase project.
 */
export { supabase as default, supabase } from '@/integrations/supabase/client';

// Convenience auth helpers (matching the old API shape)
import { supabase as _supabase } from '@/integrations/supabase/client';

export async function signIn(email: string, password: string) {
  return _supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string) {
  return _supabase.auth.signUp({ email, password });
}

export async function signOut() {
  return _supabase.auth.signOut();
}

export async function getUser() {
  const { data } = await _supabase.auth.getUser();
  return data?.user ?? null;
}

export function onAuthStateChange(callback: (event: string, session: any) => void) {
  const result = _supabase.auth.onAuthStateChange(callback);
  const subscription = result?.data?.subscription;
  return () => subscription?.unsubscribe();
}