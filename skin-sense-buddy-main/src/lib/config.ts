const DEFAULT_SUPABASE_URL = "https://lmhlxixwmtsojmvyglfb.supabase.co";

const rawApiBase = import.meta.env.VITE_API_BASE_URL?.trim();
const rawFunctionsBase =
  import.meta.env.VITE_FUNCTIONS_BASE_URL?.trim() ||
  import.meta.env.VITE_SUPABASE_FUNCTIONS_URL?.trim();

const shouldUseSupabaseFunctions = ["1", "true", "yes", "on"].includes(
  String(import.meta.env.VITE_USE_SUPABASE_FUNCTIONS || "")
    .trim()
    .toLowerCase()
);

export const APP_URL = (
  import.meta.env.VITE_APP_URL?.trim() || window.location.origin
).replace(/\/+$/, "");

const rawSupabaseUrl =
  import.meta.env.VITE_SUPABASE_URL?.trim() ||
  import.meta.env.SUPABASE_URL?.trim() ||
  DEFAULT_SUPABASE_URL;

export const FUNCTIONS_BASE = rawFunctionsBase
  ? rawFunctionsBase.replace(/\/+$/, "")
  : rawSupabaseUrl
  ? `${rawSupabaseUrl.replace(/\/+$/, "")}/functions/v1`
  : "";

export const API_BASE = rawApiBase
  ? rawApiBase.replace(/\/+$/, "") || "/api"
  : shouldUseSupabaseFunctions && FUNCTIONS_BASE
  ? `${FUNCTIONS_BASE}/api`
  : "/api";

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
}

export function buildFunctionUrl(functionName: string) {
  if (!FUNCTIONS_BASE) {
    throw new Error("Supabase functions base URL is not configured");
  }
  return `${FUNCTIONS_BASE}/${functionName}`;
}
