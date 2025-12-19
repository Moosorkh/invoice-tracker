import axios from 'axios';

// API base URL: empty string in production (same-origin), localhost in development
export const API_BASE_URL = import.meta.env.PROD ? '' : 'http://localhost:5000';

// Helper function for fetch API (for backwards compatibility with existing code)
export const getApiUrl = (path: string): string => {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${p}`;
};

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: API_BASE_URL || undefined,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

