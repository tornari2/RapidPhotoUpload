import axios from 'axios';

// Use relative path to leverage Vite proxy, or absolute URL if VITE_API_BASE_URL is set
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Create axios instance with default configuration
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout for API calls
});

/**
 * Request interceptor to add JWT token to requests
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('No auth token found in localStorage for request to:', config.url);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor to handle errors
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle both 401 (Unauthorized) and 403 (Forbidden) as authentication failures
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.warn('Authentication failed:', {
        status: error.response?.status,
        url: error.config?.url,
        hasToken: !!localStorage.getItem('auth_token'),
      });
      // Clear auth and redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

