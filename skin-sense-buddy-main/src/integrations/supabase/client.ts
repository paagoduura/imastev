// GlowSense API Client - Compatible interface with Supabase
// This provides a drop-in replacement that uses the local Express backend

import { buildApiUrl, buildFunctionUrl } from "@/lib/config";

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  (import.meta.env.SUPABASE_URL as string) ||
  "";
const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  (import.meta.env.SUPABASE_ANON_KEY as string) ||
  "";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // Refresh every 5 minutes of activity
const toApiRoute = (table: string) => table.replace(/_/g, '-');

type StoredUser = {
  id: string;
  email: string;
  created_at?: string | null;
};

const USER_STORAGE_KEY = 'glowsense_user';
const USER_EMAIL_STORAGE_KEY = 'user_email';
const USER_NAME_STORAGE_KEY = 'user_name';

const getDisplayNameFromEmail = (email: string) => {
  const localPart = email.split('@')[0] || 'User';
  const displayName = localPart
    .replace(/[._-]+/g, ' ')
    .trim();
  return displayName || 'User';
};

const syncLegacyUserFields = (user: StoredUser | null) => {
  if (user?.email) {
    localStorage.setItem(USER_EMAIL_STORAGE_KEY, user.email);
    if (!localStorage.getItem(USER_NAME_STORAGE_KEY)) {
      localStorage.setItem(USER_NAME_STORAGE_KEY, getDisplayNameFromEmail(user.email));
    }
    return;
  }

  localStorage.removeItem(USER_EMAIL_STORAGE_KEY);
  localStorage.removeItem(USER_NAME_STORAGE_KEY);
};

const decodeJwtPayload = (token: string) => {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=');
    const decoded = JSON.parse(atob(padded));

    if (!decoded?.id || !decoded?.email) {
      return null;
    }

    return decoded as { id: string; email: string; exp?: number };
  } catch {
    return null;
  }
};

const getStoredUserFromToken = (): StoredUser | null => {
  const token = getToken();
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) {
    setToken(null);
    return null;
  }

  return {
    id: payload.id,
    email: payload.email,
    created_at: null,
  };
};

// Token management
const getToken = () => localStorage.getItem('glowsense_token');
const getStoredUser = (): StoredUser | null => {
  const rawUser = localStorage.getItem(USER_STORAGE_KEY);
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser) as StoredUser;
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

const setStoredUser = (user: StoredUser | null) => {
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
  syncLegacyUserFields(user);
};

const setToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('glowsense_token', token);
    localStorage.setItem('glowsense_last_activity', Date.now().toString());
  } else {
    localStorage.removeItem('glowsense_token');
    localStorage.removeItem('glowsense_last_activity');
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(USER_EMAIL_STORAGE_KEY);
    localStorage.removeItem(USER_NAME_STORAGE_KEY);
  }
};

const logoutSession = () => {
  setToken(null);
  authListeners.forEach(cb => cb('SIGNED_OUT', null));
};

// Track last activity
const getLastActivity = () => {
  const lastActivity = localStorage.getItem('glowsense_last_activity');
  return lastActivity ? parseInt(lastActivity, 10) : 0;
};

const updateLastActivity = () => {
  localStorage.setItem('glowsense_last_activity', Date.now().toString());
};

// Check if session is expired (30 minutes of inactivity)
const isSessionExpired = () => {
  const lastActivity = getLastActivity();
  if (!lastActivity) return true;
  return Date.now() - lastActivity > SESSION_TIMEOUT_MS;
};

// Refresh token if needed
let refreshPromise: Promise<void> | null = null;
const refreshTokenIfNeeded = async () => {
  const token = getToken();
  if (!token) return;
  
  // If session expired, clear and don't refresh
  if (isSessionExpired()) {
    logoutSession();
    window.location.href = '/auth';
    return;
  }
  
  const lastActivity = getLastActivity();
  const timeSinceActivity = Date.now() - lastActivity;
  
  // Only refresh if more than 5 minutes since last refresh
  if (timeSinceActivity > REFRESH_INTERVAL_MS) {
    if (refreshPromise) return refreshPromise;
    
    refreshPromise = (async () => {
      try {
        const response = await fetch(buildApiUrl('/auth/refresh'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.token) {
            setToken(data.token);
          }
        } else if (response.status === 401 || response.status === 403) {
          // Token is invalid, clear and redirect
          logoutSession();
          window.location.href = '/auth';
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
      } finally {
        refreshPromise = null;
      }
    })();
    
    return refreshPromise;
  }
  
  // Just update activity timestamp
  updateLastActivity();
};

// Fetch wrapper with auth
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  // Check session and refresh token if needed (skip for auth endpoints)
  if (!url.includes('/auth/')) {
    await refreshTokenIfNeeded();
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (SUPABASE_ANON_KEY) {
    headers.apikey = SUPABASE_ANON_KEY;
  }

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(buildApiUrl(url), {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    logoutSession();
  }

  return response;
};

// Query builder that mimics Supabase interface
class QueryBuilder {
  private table: string;
  private queryParams: URLSearchParams;
  private selectFields: string = '*';
  private filters: string[] = [];
  private orderField: string = '';
  private orderAsc: boolean = true;
  private limitCount: number | null = null;
  private singleResult: boolean = false;
  private countOnly: boolean = false;
  private headOnly: boolean = false;

  constructor(table: string) {
    this.table = table;
    this.queryParams = new URLSearchParams();
  }

  select(fields: string = '*', options?: { count?: string; head?: boolean }) {
    this.selectFields = fields;
    if (options?.count) {
      this.countOnly = true;
    }
    if (options?.head) {
      this.headOnly = true;
    }
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push(`${column}:eq:${value}`);
    return this;
  }

  contains(column: string, value: any) {
    this.filters.push(`${column}:contains:${JSON.stringify(value)}`);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderField = column;
    this.orderAsc = options?.ascending !== false;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.singleResult = true;
    return this;
  }

  maybeSingle() {
    this.singleResult = true;
    return this;
  }

  async then(resolve: (value: any) => void, reject?: (reason?: any) => void) {
    try {
      const result = await this.execute();
      resolve(result);
    } catch (error) {
      if (reject) reject(error);
    }
  }

  private async execute() {
    try {
      // Map table names to API routes (handle underscores to hyphens)
      const apiRoute = toApiRoute(this.table);
      const response = await fetchWithAuth(`/${apiRoute}`);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        return { data: null, error };
      }

      let data = await response.json();
      
      // Apply filters client-side for compatibility
      if (Array.isArray(data)) {
        for (const filter of this.filters) {
          const [column, op, value] = filter.split(':');
          if (op === 'eq') {
            data = data.filter((item: any) => String(item[column]) === value);
          }
        }
        
        // Apply ordering
        if (this.orderField) {
          data.sort((a: any, b: any) => {
            const aVal = a[this.orderField];
            const bVal = b[this.orderField];
            return this.orderAsc ? 
              (aVal > bVal ? 1 : -1) : 
              (aVal < bVal ? 1 : -1);
          });
        }
        
        // Apply limit
        if (this.limitCount) {
          data = data.slice(0, this.limitCount);
        }
      }

      if (this.countOnly && this.headOnly) {
        const count = Array.isArray(data) ? data.length : 0;
        return { count, data: null, error: null };
      }

      if (this.singleResult) {
        return { data: Array.isArray(data) ? data[0] || null : data, error: null };
      }

      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: { message: error.message } };
    }
  }
}

// Upsert builder
class UpsertBuilder {
  private table: string;
  private upsertData: any;
  private options: any;

  constructor(table: string, data: any, options?: any) {
    this.table = table;
    this.upsertData = data;
    this.options = options;
  }

  select() {
    return this;
  }

  single() {
    return this;
  }

  async then(resolve: (value: any) => void, reject?: (reason?: any) => void) {
    try {
      const response = await fetchWithAuth(`/${toApiRoute(this.table)}`, {
        method: 'POST',
        body: JSON.stringify(this.upsertData),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Upsert failed' }));
        resolve({ data: null, error });
        return;
      }

      const data = await response.json();
      resolve({ data, error: null });
    } catch (error: any) {
      resolve({ data: null, error: { message: error.message } });
    }
  }
}

// Insert builder
class InsertBuilder {
  private table: string;
  private insertData: any;
  private returnData: boolean = false;

  constructor(table: string, data: any) {
    this.table = table;
    this.insertData = data;
  }

  select() {
    this.returnData = true;
    return this;
  }

  single() {
    return this;
  }

  async then(resolve: (value: any) => void, reject?: (reason?: any) => void) {
    try {
      const response = await fetchWithAuth(`/${toApiRoute(this.table)}`, {
        method: 'POST',
        body: JSON.stringify(this.insertData),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Insert failed' }));
        resolve({ data: null, error });
        return;
      }

      const data = await response.json();
      resolve({ data, error: null });
    } catch (error: any) {
      resolve({ data: null, error: { message: error.message } });
    }
  }
}

// Update builder
class UpdateBuilder {
  private table: string;
  private updateData: any;
  private filters: { column: string; value: any }[] = [];

  constructor(table: string, data: any) {
    this.table = table;
    this.updateData = data;
  }

  eq(column: string, value: any) {
    this.filters.push({ column, value });
    return this;
  }

  select() {
    return this;
  }

  single() {
    return this;
  }

  async then(resolve: (value: any) => void, reject?: (reason?: any) => void) {
    try {
      const id = this.filters.find(f => f.column === 'id')?.value || 
                 this.filters.find(f => f.column === 'user_id')?.value;
      
      const apiRoute = toApiRoute(this.table);
      const response = await fetchWithAuth(`/${apiRoute}${id ? `/${id}` : ''}`, {
        method: 'PUT',
        body: JSON.stringify(this.updateData),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Update failed' }));
        resolve({ data: null, error });
        return;
      }

      const data = await response.json();
      resolve({ data, error: null });
    } catch (error: any) {
      resolve({ data: null, error: { message: error.message } });
    }
  }
}

// Auth state change listeners
type AuthCallback = (event: string, session: any) => void;
const authListeners: AuthCallback[] = [];

// Supabase-compatible client interface
export const supabase = {
  auth: {
    getUser: async () => {
      const tokenUser = getStoredUserFromToken();
      const user = tokenUser || getStoredUser();
      if (tokenUser && (!user || user.id !== tokenUser.id || user.email !== tokenUser.email)) {
        setStoredUser(tokenUser);
      }
      return { data: { user: user || null }, error: null };
    },

    getSession: async () => {
      const token = getToken();
      const tokenUser = getStoredUserFromToken();
      const user = tokenUser || getStoredUser();
      if (tokenUser && (!user || user.id !== tokenUser.id || user.email !== tokenUser.email)) {
        setStoredUser(tokenUser);
      }
      if (!token || !user) {
        return { data: { session: null }, error: null };
      }

      return {
        data: {
          session: {
            user,
            access_token: token
          }
        },
        error: null
      };
    },

    signUp: async ({ email, password, options }: { email: string; password: string; options?: any }) => {
      try {
        const response = await fetch(buildApiUrl('/auth/signup'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          return { data: { user: null, session: null }, error: { message: body.error || body.message || "Sign up failed" } };
        }

        const data = await response.json();
        if (data.token) {
          setToken(data.token);
        } else {
          setToken(null);
        }
        setStoredUser(data.user ?? null);
        
        // Notify listeners
        const session = data.token ? { user: data.user, access_token: data.token } : null;
        authListeners.forEach(cb => cb(data.token ? 'SIGNED_IN' : 'SIGNED_OUT', session));

        return { data: { user: data.user, session }, error: null };
      } catch (error: any) {
        return { data: { user: null, session: null }, error: { message: error.message } };
      }
    },

    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      try {
        const response = await fetch(buildApiUrl('/auth/signin'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          return { data: { user: null, session: null }, error: { message: body.error || body.message || "Invalid email or password" } };
        }

        const data = await response.json();
        setToken(data.token);
        setStoredUser(data.user ?? null);
        
        // Notify listeners
        const session = { user: data.user, access_token: data.token };
        authListeners.forEach(cb => cb('SIGNED_IN', session));

        return { data: { user: data.user, session }, error: null };
      } catch (error: any) {
        return { data: { user: null, session: null }, error: { message: error.message } };
      }
    },

    signInWithGoogleIdToken: async ({ credential }: { credential: string }) => {
      try {
        const response = await fetch(buildApiUrl('/auth/google'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          return { data: { user: null, session: null }, error: { message: body.error || body.message || "Google sign-in failed" } };
        }

        const data = await response.json();
        setToken(data.token);
        setStoredUser(data.user ?? null);

        const session = { user: data.user, access_token: data.token };
        authListeners.forEach(cb => cb('SIGNED_IN', session));

        return { data: { user: data.user, session }, error: null };
      } catch (error: any) {
        return { data: { user: null, session: null }, error: { message: error.message } };
      }
    },

    signOut: async () => {
      logoutSession();
      return { error: null };
    },

    verifyEmail: async ({ token }: { token: string }) => {
      try {
        const response = await fetch(`${buildApiUrl('/auth/verify-email')}?token=${encodeURIComponent(token)}`);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          return { data: { user: null, session: null }, error: { message: data.error || data.message || 'Email verification failed' } };
        }

        if (data.token) {
          setToken(data.token);
        }
        setStoredUser(data.user ?? null);

        const session = data.token ? { user: data.user, access_token: data.token } : null;
        if (session) {
          authListeners.forEach(cb => cb('SIGNED_IN', session));
        }

        return { data: { user: data.user, session }, error: null };
      } catch (error: any) {
        return { data: { user: null, session: null }, error: { message: error.message } };
      }
    },

    resendVerificationEmail: async ({ email }: { email: string }) => {
      try {
        const response = await fetch(buildApiUrl('/auth/resend-verification'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          return { data: null, error: { message: data.error || data.message || 'Unable to resend verification email' } };
        }

        return { data, error: null };
      } catch (error: any) {
        return { data: null, error: { message: error.message } };
      }
    },

    onAuthStateChange: (callback: AuthCallback) => {
      authListeners.push(callback);
      
      // Check initial state
      const token = getToken();
      const user = getStoredUser() || getStoredUserFromToken();
      if (token && user) {
        callback('INITIAL_SESSION', { user, access_token: token });
      }

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              const index = authListeners.indexOf(callback);
              if (index > -1) {
                authListeners.splice(index, 1);
              }
            }
          }
        }
      };
    }
  },

  from: (table: string) => ({
    select: (fields?: string, options?: { count?: string; head?: boolean }) => {
      const builder = new QueryBuilder(table);
      return builder.select(fields, options);
    },
    insert: (data: any) => new InsertBuilder(table, data),
    upsert: (data: any, options?: any) => new UpsertBuilder(table, data, options),
    update: (data: any) => new UpdateBuilder(table, data),
    delete: () => ({
      eq: (column: string, value: any) => ({
        then: async (resolve: (value: any) => void) => {
          try {
            await fetchWithAuth(`/${toApiRoute(table)}/${value}`, { method: 'DELETE' });
            resolve({ error: null });
          } catch (error: any) {
            resolve({ error: { message: error.message } });
          }
        }
      })
    }),
  }),

  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: File | Blob, options?: { contentType?: string; upsert?: boolean }) => {
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
          return { data: null, error: { message: 'Supabase storage is not configured' } };
        }

        const token = getToken();
        if (!token) {
          return { data: null, error: { message: 'Authentication required' } };
        }

        const uploadUrl = `${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/${bucket}/${path}`;
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token}`,
            'x-upsert': options?.upsert ? 'true' : 'false',
            'Content-Type': options?.contentType || file.type || 'application/octet-stream',
          },
          body: file,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: 'Upload failed' }));
          return { data: null, error };
        }

        const data = await response.json();
        return { data: { path: data?.Key || path }, error: null };
      },
      getPublicUrl: (path: string) => {
        const base = SUPABASE_URL.replace(/\/+$/, '');
        return { data: { publicUrl: `${base}/storage/v1/object/public/${bucket}/${path}` } };
      }
    })
  },

  functions: {
    invoke: async (functionName: string, options?: { body?: any }) => {
      const body = options?.body || {};

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        const token = getToken();
        if (SUPABASE_ANON_KEY) {
          headers.apikey = SUPABASE_ANON_KEY;
        }
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(buildFunctionUrl(functionName), {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const error = await response.json();
          return { data: null, error };
        }

        const data = await response.json();
        return { data, error: null };
      } catch (error: any) {
        return { data: null, error: { message: error.message } };
      }
    }
  }
};

// Export for compatibility
export type { Database } from './types';
