import axios from 'axios';

// Get the API base URL from environment variable or use same-origin for production
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Changed to false for Railway production
});

// Add auth token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Helper function for fetch API (for backwards compatibility with existing code)
export const getApiUrl = (path: string): string => {
  // In production, use same-origin relative paths
  if (import.meta.env.PROD) {
    return path;
  }
  // In development with Vite, use localhost
  return `http://localhost:5000${path}`;
};
  return path;
};

export { API_BASE_URL };

