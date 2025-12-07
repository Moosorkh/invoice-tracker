import axios from 'axios';

// Get the API base URL from environment variable or use relative path for development
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
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
  // If we have a full API URL (production), prepend it
  if (API_BASE_URL) {
    return `${API_BASE_URL}${path}`;
  }
  // Otherwise, use relative path (development with Vite proxy)
  return path;
};

export { API_BASE_URL };

