// GlowSense API Client
// Replaces Supabase client with local backend API

const API_BASE = '/api';

// Token management
let authToken: string | null = localStorage.getItem('glowsense_token');

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('glowsense_token', token);
  } else {
    localStorage.removeItem('glowsense_token');
  }
};

export const getAuthToken = () => authToken;

// Fetch wrapper with auth
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
};

// Auth API
export const auth = {
  signUp: async (email: string, password: string) => {
    const data = await fetchWithAuth('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(data.token);
    return data;
  },

  signIn: async (email: string, password: string) => {
    const data = await fetchWithAuth('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(data.token);
    return data;
  },

  signOut: () => {
    setAuthToken(null);
    window.location.href = '/auth';
  },

  getUser: async () => {
    if (!authToken) return { user: null };
    try {
      return await fetchWithAuth('/auth/user');
    } catch {
      setAuthToken(null);
      return { user: null };
    }
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    // Check auth on load
    const token = localStorage.getItem('glowsense_token');
    if (token) {
      setAuthToken(token);
      callback('SIGNED_IN', { user: { id: 'pending' } });
    }
    
    // Listen for storage changes
    window.addEventListener('storage', (e) => {
      if (e.key === 'glowsense_token') {
        if (e.newValue) {
          callback('SIGNED_IN', { user: { id: 'pending' } });
        } else {
          callback('SIGNED_OUT', null);
        }
      }
    });

    return {
      data: { subscription: { unsubscribe: () => {} } }
    };
  }
};

// Profiles API
export const profiles = {
  get: async () => fetchWithAuth('/profiles'),
  update: async (data: any) => fetchWithAuth('/profiles', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

// Products API
export const products = {
  list: async (params?: { type?: string; category?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return fetchWithAuth(`/products${query ? `?${query}` : ''}`);
  },
  get: async (id: string) => fetchWithAuth(`/products/${id}`),
};

// Cart API
export const cart = {
  list: async () => fetchWithAuth('/cart'),
  add: async (productId: string, quantity = 1) => fetchWithAuth('/cart', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, quantity }),
  }),
  update: async (id: string, quantity: number) => fetchWithAuth(`/cart/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ quantity }),
  }),
  remove: async (id: string) => fetchWithAuth(`/cart/${id}`, {
    method: 'DELETE',
  }),
};

// Scans API
export const scans = {
  list: async () => fetchWithAuth('/scans'),
  get: async (id: string) => fetchWithAuth(`/scans/${id}`),
  create: async (formData: FormData) => {
    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    const response = await fetch(`${API_BASE}/scans`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    return response.json();
  },
  analyze: async (scanId: string, type: 'skin' | 'hair') => 
    fetchWithAuth(`/analyze/${type}`, {
      method: 'POST',
      body: JSON.stringify({ scanId }),
    }),
};

// Diagnoses API
export const diagnoses = {
  list: async () => fetchWithAuth('/diagnoses'),
};

// Subscriptions API
export const subscriptions = {
  getPlans: async () => fetchWithAuth('/subscription-plans'),
  getCurrent: async () => fetchWithAuth('/subscriptions'),
};

// Clinicians API
export const clinicians = {
  list: async () => fetchWithAuth('/clinicians'),
};

// Appointments API
export const appointments = {
  list: async () => fetchWithAuth('/appointments'),
  create: async (data: { clinician_id: string; scheduled_at: string; duration_minutes?: number }) =>
    fetchWithAuth('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Family Accounts API
export const familyAccounts = {
  list: async () => fetchWithAuth('/family-accounts'),
};

// Formulations API
export const formulations = {
  list: async () => fetchWithAuth('/formulations'),
  generate: async (diagnosisId: string) => fetchWithAuth('/formulations/generate', {
    method: 'POST',
    body: JSON.stringify({ diagnosis_id: diagnosisId }),
  }),
};

// Orders API
export const orders = {
  list: async () => fetchWithAuth('/orders'),
  create: async (data: { shipping_address: any; payment_method: string }) =>
    fetchWithAuth('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Default export for compatibility
const api = {
  auth,
  profiles,
  products,
  cart,
  scans,
  diagnoses,
  subscriptions,
  clinicians,
  appointments,
  familyAccounts,
  formulations,
  orders,
};

export default api;
