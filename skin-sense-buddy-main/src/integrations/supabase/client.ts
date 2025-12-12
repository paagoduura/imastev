// GlowSense API Client - Compatible interface with Supabase
// This provides a drop-in replacement that uses the local Express backend

const API_BASE = '/api';

// Token management
const getToken = () => localStorage.getItem('glowsense_token');
const setToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('glowsense_token', token);
  } else {
    localStorage.removeItem('glowsense_token');
  }
};

// Fetch wrapper with auth
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

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
      const response = await fetchWithAuth(`/${this.table}`);
      
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
      const response = await fetchWithAuth(`/${this.table}`, {
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
      const response = await fetchWithAuth(`/${this.table}`, {
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
      
      const response = await fetchWithAuth(`/${this.table}${id ? `/${id}` : ''}`, {
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
      const token = getToken();
      if (!token) {
        return { data: { user: null }, error: null };
      }

      try {
        const response = await fetchWithAuth('/auth/user');
        if (!response.ok) {
          return { data: { user: null }, error: null };
        }
        const data = await response.json();
        return { data: { user: data.user }, error: null };
      } catch (error) {
        return { data: { user: null }, error: null };
      }
    },

    getSession: async () => {
      const token = getToken();
      if (!token) {
        return { data: { session: null }, error: null };
      }
      
      try {
        const response = await fetchWithAuth('/auth/user');
        if (!response.ok) {
          return { data: { session: null }, error: null };
        }
        const data = await response.json();
        return { 
          data: { 
            session: { 
              user: data.user,
              access_token: token
            } 
          }, 
          error: null 
        };
      } catch (error) {
        return { data: { session: null }, error: null };
      }
    },

    signUp: async ({ email, password, options }: { email: string; password: string; options?: any }) => {
      try {
        const response = await fetch(`${API_BASE}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const error = await response.json();
          return { data: { user: null, session: null }, error };
        }

        const data = await response.json();
        setToken(data.token);
        
        // Notify listeners
        const session = { user: data.user, access_token: data.token };
        authListeners.forEach(cb => cb('SIGNED_IN', session));

        return { data: { user: data.user, session }, error: null };
      } catch (error: any) {
        return { data: { user: null, session: null }, error: { message: error.message } };
      }
    },

    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      try {
        const response = await fetch(`${API_BASE}/auth/signin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const error = await response.json();
          return { data: { user: null, session: null }, error };
        }

        const data = await response.json();
        setToken(data.token);
        
        // Notify listeners
        const session = { user: data.user, access_token: data.token };
        authListeners.forEach(cb => cb('SIGNED_IN', session));

        return { data: { user: data.user, session }, error: null };
      } catch (error: any) {
        return { data: { user: null, session: null }, error: { message: error.message } };
      }
    },

    signOut: async () => {
      setToken(null);
      authListeners.forEach(cb => cb('SIGNED_OUT', null));
      return { error: null };
    },

    onAuthStateChange: (callback: AuthCallback) => {
      authListeners.push(callback);
      
      // Check initial state
      const token = getToken();
      if (token) {
        supabase.auth.getUser().then(({ data }) => {
          if (data.user) {
            callback('INITIAL_SESSION', { user: data.user, access_token: token });
          }
        });
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
            await fetchWithAuth(`/${table}/${value}`, { method: 'DELETE' });
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
      upload: async (path: string, file: File) => {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('type', bucket.replace('-scans', ''));

        const token = getToken();
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE}/scans`, {
          method: 'POST',
          headers,
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          return { data: null, error };
        }

        const data = await response.json();
        return { data: { path: data.image_url }, error: null };
      },
      getPublicUrl: (path: string) => {
        return { data: { publicUrl: path } };
      }
    })
  },

  functions: {
    invoke: async (functionName: string, options?: { body?: any }) => {
      const body = options?.body || {};
      
      // Map function names to API endpoints
      const endpoints: Record<string, string> = {
        'analyze-skin': '/analyze/skin',
        'analyze-hair': '/analyze/hair',
        'generate-formulation': '/formulations/generate',
        'create-checkout': '/checkout',
      };

      const endpoint = endpoints[functionName] || `/${functionName}`;

      try {
        const response = await fetchWithAuth(endpoint, {
          method: 'POST',
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
