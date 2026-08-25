import { buildApiUrl } from "@/lib/config";

const ADMIN_TOKEN_KEY = "imstev_admin_token";

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string | null) {
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export async function adminFetch(path: string, options: RequestInit = {}) {
  const token = getAdminToken();
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = new Headers(options.headers || {});
  if (!isFormData && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(buildApiUrl(path), { ...options, headers });
  } catch {
    throw new Error("The admin service is unavailable. Please try again in a moment.");
  }

  const contentType = response.headers.get("content-type") || "";
  const responseText = await response.text();
  let payload: Record<string, unknown> = {};
  if (responseText && contentType.includes("application/json")) {
    try {
      const parsed = JSON.parse(responseText);
      if (parsed && typeof parsed === "object") payload = parsed as Record<string, unknown>;
    } catch {
      // Keep the deployment error below rather than exposing parser details.
    }
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) setAdminToken(null);
    const errorMessage = typeof payload.error === "string" ? payload.error : "Request failed";
    throw new Error(errorMessage);
  }

  if (!contentType.includes("application/json")) {
    throw new Error("The admin service returned an invalid response. Please contact the site administrator.");
  }

  try {
    return responseText ? JSON.parse(responseText) : null;
  } catch {
    throw new Error("The admin service returned an invalid response. Please try again.");
  }
}

export async function adminLogin(email: string, password: string) {
  const data = await adminFetch("/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (data?.token) setAdminToken(data.token);
  return data;
}

export function getAdminMe() {
  return adminFetch("/admin/me");
}

export function adminLogout() {
  setAdminToken(null);
}
