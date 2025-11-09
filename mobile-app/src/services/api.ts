import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Determine the correct API base URL based on the environment
const getApiBaseUrl = (): string => {
  if (!__DEV__) {
    return 'https://your-production-api.com'; // Production API URL
  }

  // Development mode - detect platform and use appropriate URL
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';
  
  // Your computer's local IP address - update this if it changes
  // Find it by running: ifconfig | grep "inet " | grep -v 127.0.0.1
  const COMPUTER_IP = '10.10.0.209';
  
  if (isIOS) {
    // iOS Simulator: Use localhost (simulator can access host machine's localhost)
    // For physical iOS device, change this to: `http://${COMPUTER_IP}:8080`
    return 'http://localhost:8080';
  } else if (isAndroid) {
    // Android Emulator - use special IP that maps to host machine
    // For physical Android device, change this to your computer's IP: `http://${COMPUTER_IP}:8080`
    return 'http://10.0.2.2:8080';
  } else {
    // Fallback for other platforms
    return `http://${COMPUTER_IP}:8080`;
  }
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
    // Enhanced error logging for network issues
    if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
      console.error('[API] Network Error Details:', {
        message: error.message,
        code: error.code,
        baseURL: API_BASE_URL,
        url: error.config?.url,
        platform: Platform.OS,
        suggestion: Platform.OS === 'ios' 
          ? 'If using iOS Simulator, ensure backend is running on localhost:8080. For physical device, update API_BASE_URL to your computer IP.'
          : Platform.OS === 'android'
          ? 'If using Android Emulator, ensure backend is running and accessible via 10.0.2.2:8080. For physical device, update API_BASE_URL to your computer IP.'
          : 'Ensure backend is running and device/emulator can reach it',
      });
    }

    const originalRequest = error.config as any;

    // Don't try to refresh token for login/register endpoints or refresh endpoint itself
    const isAuthEndpoint = originalRequest?.url?.includes('/api/auth/login') || 
                          originalRequest?.url?.includes('/api/auth/register') ||
                          originalRequest?.url?.includes('/api/auth/refresh');

    // If error is 401 and we haven't tried to refresh yet (and it's not an auth endpoint)
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
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
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        // You can dispatch a logout action here if using Redux
        return Promise.reject(refreshError);
      }
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

