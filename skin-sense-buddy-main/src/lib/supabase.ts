import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || (import.meta.env.SUPABASE_URL as string)
const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || (import.meta.env.SUPABASE_ANON_KEY as string)

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase keys not found in env. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

export const supabase: SupabaseClient = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '')

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signUp(email: string, password: string) {
  return supabase.auth.signUp({ email, password })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function getUser() {
  const { data } = await supabase.auth.getUser()
  return data.user
}

export function onAuthStateChange(callback: (event: string, session: any) => void) {
  const { subscription } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
  return () => subscription.unsubscribe()
}

export default supabase
