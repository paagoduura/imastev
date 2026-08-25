const rawApiBase = import.meta.env.VITE_API_BASE_URL?.trim();
const rawFunctionsBase =
  import.meta.env.VITE_FUNCTIONS_BASE_URL?.trim() ||
  import.meta.env.VITE_SUPABASE_FUNCTIONS_URL?.trim();
const rawSupabaseUrl =
  import.meta.env.VITE_SUPABASE_URL?.trim() ||
  import.meta.env.SUPABASE_URL?.trim() ||
  "";
const configuredUseSupabaseFunctions = String(import.meta.env.VITE_USE_SUPABASE_FUNCTIONS || "")
  .trim()
  .toLowerCase();
const shouldUseSupabaseFunctions = ["1", "true", "yes", "on"].includes(configuredUseSupabaseFunctions) ||
  (!configuredUseSupabaseFunctions && Boolean(import.meta.env.PROD && (rawFunctionsBase || rawSupabaseUrl)));

export const APP_URL = (
  import.meta.env.VITE_APP_URL?.trim() || window.location.origin
).replace(/\/+$/, "");

export const FUNCTIONS_BASE = rawFunctionsBase
  ? rawFunctionsBase.replace(/\/+$/, "")
  : rawSupabaseUrl
  ? `${rawSupabaseUrl.replace(/\/+$/, "")}/functions/v1`
  : "";

const normalizedApiBase = rawApiBase?.replace(/\/+$/, "") || "";
const hasExplicitRemoteApiBase = Boolean(normalizedApiBase && normalizedApiBase !== "/api");

export const API_BASE = hasExplicitRemoteApiBase
  ? normalizedApiBase
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
