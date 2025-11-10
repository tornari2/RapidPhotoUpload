import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Determine the correct API base URL based on the environment
const getApiBaseUrl = (): string => {
  // Always use production backend for mobile app (no local backend running)
  return 'http://rapid-photo-upload-env.eba-mhsctwie.us-east-2.elasticbeanstalk.com';
  
  // Uncomment below to use local backend in development:
  /*
  if (!__DEV__) {
    return 'http://rapid-photo-upload-env.eba-mhsctwie.us-east-2.elasticbeanstalk.com';
  }

  // Development mode - detect platform and use appropriate URL
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';
  
  const COMPUTER_IP = '10.10.0.209';
  
  if (isIOS) {
    return 'http://localhost:8080';
  } else if (isAndroid) {
    return 'http://10.0.2.2:8080';
  } else {
    return `http://${COMPUTER_IP}:8080`;
  }
  */
};

// API configuration
const API_BASE_URL = getApiBaseUrl();

// Log the API URL being used (helpful for debugging)
console.log(`[API] Using base URL: ${API_BASE_URL} (Platform: ${Platform.OS})`);

// Token storage keys
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config: AxiosRequestConfig): Promise<any> => {
    // Don't add auth token for login/register endpoints
    const isAuthEndpoint = config.url?.includes('/api/auth/login') || 
                          config.url?.includes('/api/auth/register');
    
    if (!isAuthEndpoint) {
      try {
        const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Error getting token from secure store:', error);
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Enhanced error logging for 403 errors
    if (error.response?.status === 403) {
      const hasToken = !!(await SecureStore.getItemAsync(ACCESS_TOKEN_KEY));
      console.error('[API] 403 Forbidden Error Details:', {
        url: originalRequest?.url,
        method: originalRequest?.method,
        message: error.response?.data?.message || error.message,
        hasToken,
        suggestion: 'This may indicate: 1) Token expired or invalid, 2) User ID mismatch, 3) Insufficient permissions',
      });
    }

    // Don't try to refresh token for login/register endpoints or refresh endpoint itself
    const isAuthEndpoint = originalRequest?.url?.includes('/api/auth/login') || 
                          originalRequest?.url?.includes('/api/auth/register') ||
                          originalRequest?.url?.includes('/api/auth/refresh');

    // If error is 401 or 403 and we haven't tried to refresh yet (and it's not an auth endpoint)
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        
        if (refreshToken) {
          // Try to refresh the token - backend expects { token: "..." }
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            token: refreshToken,
          });

          // Backend returns LoginResponse format
          const newToken = response.data.token;

          // Store new tokens
          await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, newToken);
          await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newToken);

          // Retry the original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and force re-login
        console.error('[API] Token refresh failed:', refreshError);
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        // You can dispatch a logout action here if using Redux
        return Promise.reject(refreshError);
      }
    }
    
    // If 403 persists after refresh attempt, it's likely a real authorization issue
    // (e.g., user ID mismatch, insufficient permissions)
    if (error.response?.status === 403 && originalRequest._retry) {
      console.error('[API] 403 Forbidden persisted after token refresh - likely authorization issue');
      // Don't clear tokens here as it might be a temporary issue
      // But log it for debugging
    }
    
    // For auth endpoints with 401, clear any stale tokens
    if (error.response?.status === 401 && isAuthEndpoint) {
      try {
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      } catch (clearError) {
        // Ignore errors when clearing
      }
    }

    return Promise.reject(error);
  }
);

// Token management functions
export const setAuthTokens = async (accessToken: string, refreshToken: string): Promise<void> => {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
};

export const getAccessToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
};

export const clearAuthTokens = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
};

export default apiClient;

