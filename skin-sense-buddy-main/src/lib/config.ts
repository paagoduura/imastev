const DEFAULT_SUPABASE_URL = "https://lmhlxixwmtsojmvyglfb.supabase.co";
const rawApiBase = import.meta.env.VITE_API_BASE_URL?.trim();
export const APP_URL = (import.meta.env.VITE_APP_URL?.trim() || window.location.origin).replace(/\/+$/, '');
const isLocalPreviewHost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(window.location.hostname);
const rawSupabaseUrl =
  import.meta.env.VITE_SUPABASE_URL?.trim() ||
  import.meta.env.SUPABASE_URL?.trim() ||
  DEFAULT_SUPABASE_URL;

export const FUNCTIONS_BASE = rawSupabaseUrl
  ? `${rawSupabaseUrl.replace(/\/+$/, "")}/functions/v1`
  : "";

export const API_BASE = isLocalPreviewHost
  ? "/api"
  : rawApiBase
    ? rawApiBase === "/api" && FUNCTIONS_BASE
      ? `${FUNCTIONS_BASE}/api`
      : rawApiBase.replace(/\/+$/, "") || "/api"
    : FUNCTIONS_BASE
      ? `${FUNCTIONS_BASE}/api`
      : "/api";

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
}

export function buildFunctionUrl(functionName: string) {
  if (!FUNCTIONS_BASE) {
    throw new Error("Supabase functions base URL is not configured");
  }

  return `${FUNCTIONS_BASE}/${functionName}`;
}
