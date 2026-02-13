import axios from 'axios';

// Helper function to get tenant slug from localStorage
const getTenantSlug = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tenantSlug');
};

// Helper function for fetch API with tenant-scoped paths
// Use this for ALL fetch() calls to ensure proper tenant scoping
export const getApiUrl = (path: string): string => {
  const p = path.startsWith('/') ? path : `/${path}`;
  
  // Don't scope auth endpoints (no tenant known yet)
  if (p.startsWith('/api/auth')) {
    return p;
  }
  
  // Don't scope portal endpoints (they already have /t/:slug in the path)
  if (p.includes('/portal/')) {
    return p;
  }
  
  // For all other API calls, prepend tenant slug
  const tenantSlug = getTenantSlug();
  if (tenantSlug && !p.includes('/t/')) {
    // Transform /api/* to /t/:slug/api/*
    return `/t/${tenantSlug}${p}`;
  }
  
  return p;
};

export const getPortalUrl = (tenantSlug: string, path: string = '') => {
  return `/t/${tenantSlug}/portal${path}`;
};

export const api = axios.create({
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
