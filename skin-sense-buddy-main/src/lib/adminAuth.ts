import { buildApiUrl } from "@/lib/config";

const ADMIN_TOKEN_KEY = "imstev_admin_token";

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string | null) {
  if (token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  }
}

export async function adminFetch(path: string, options: RequestInit = {}) {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildApiUrl(path), {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }

  return response.json();
}

export async function adminLogin(email: string, password: string) {
  const data = await adminFetch("/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (data?.token) {
    setAdminToken(data.token);
  }

  return data;
}

export async function getAdminMe() {
  return adminFetch("/admin/me");
}

export function adminLogout() {
  setAdminToken(null);
}
