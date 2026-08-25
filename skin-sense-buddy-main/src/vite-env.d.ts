/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_FUNCTIONS_BASE_URL?: string;
  readonly VITE_SUPABASE_FUNCTIONS_URL?: string;
  readonly VITE_USE_SUPABASE_FUNCTIONS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
