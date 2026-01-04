import axios from 'axios';

// API base URL: empty string in production (same-origin), localhost in development
export const API_BASE_URL = import.meta.env.PROD ? '' : 'http://localhost:5000';

// Helper function to get tenant slug from localStorage
const getTenantSlug = (): string | null => {
  const tenantSlug = localStorage.getItem('tenantSlug');
  return tenantSlug;
};

// Helper function for fetch API with tenant-scoped paths
// Use this for ALL fetch() calls to ensure proper tenant scoping
export const getApiUrl = (path: string): string => {
  const p = path.startsWith('/') ? path : `/${path}`;
  
  // Don't scope auth endpoints (no tenant known yet)
  if (p.startsWith('/api/auth')) {
    return `${API_BASE_URL}${p}`;
  }
  
  // Don't scope portal endpoints (they already have /t/:slug in the path)
  if (p.includes('/portal/')) {
    return `${API_BASE_URL}${p}`;
  }
  
  // For all other API calls, prepend tenant slug
  const tenantSlug = getTenantSlug();
  if (tenantSlug && !p.includes('/t/')) {
    // Transform /api/* to /t/:slug/api/*
    return `${API_BASE_URL}/t/${tenantSlug}${p}`;
  }
  
  return `${API_BASE_URL}${p}`;
};

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: API_BASE_URL || undefined,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token and tenant slug to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Transform API paths to be tenant-scoped (except auth endpoints)
  if (config.url && !config.url.startsWith('/api/auth') && !config.url.includes('/t/')) {
    const tenantSlug = getTenantSlug();
    if (tenantSlug) {
      // Transform /api/* to /t/:slug/api/*
      config.url = `/t/${tenantSlug}${config.url}`;
    }
  }
  
  return config;
});

export default api;

