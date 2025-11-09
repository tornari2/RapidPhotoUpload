import apiClient, { setAuthTokens, clearAuthTokens } from './api';
import { LoginRequest, RegisterRequest, User } from '../types';

interface BackendLoginResponse {
  token: string;
  type: string;
  expiresIn: number;
  userId: string;
  username: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

/**
 * Authentication service for login, registration, and token management
 */

export const authService = {
  /**
   * Login with username and password
   */
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<BackendLoginResponse>('/api/auth/login', credentials);
      
      // Map backend response to frontend format
      const authResponse: AuthResponse = {
        accessToken: response.data.token,
        refreshToken: response.data.token, // Backend doesn't provide refresh token separately
        user: {
          id: response.data.userId,
          username: response.data.username,
          email: '', // Backend doesn't provide email
        },
      };
      
      // Store tokens in secure storage
      await setAuthTokens(authResponse.accessToken, authResponse.refreshToken);
      
      return authResponse;
    } catch (error: any) {
      console.error('Login error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
      });
      
      // Handle backend error response format
      let errorMessage = 'Login failed. Please try again.';
      if (error.response?.data) {
        // Backend returns { error: "message" } format
        if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  },

  /**
   * Register a new user
   */
  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<BackendLoginResponse>('/api/auth/register', userData);
      
      // Map backend response to frontend format
      const authResponse: AuthResponse = {
        accessToken: response.data.token,
        refreshToken: response.data.token, // Backend doesn't provide refresh token separately
        user: {
          id: response.data.userId,
          username: response.data.username,
          email: '', // Backend doesn't provide email
        },
      };
      
      // Store tokens in secure storage
      await setAuthTokens(authResponse.accessToken, authResponse.refreshToken);
      
      return authResponse;
    } catch (error: any) {
      console.error('Registration error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
      });
      
      // Handle backend error response format
      let errorMessage = 'Registration failed. Please try again.';
      if (error.response?.data) {
        // Backend returns { error: "message" } format
        if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  },

  /**
   * Logout user and clear tokens
   */
  logout: async (): Promise<void> => {
    try {
      // Optional: Call backend logout endpoint if it exists
      // await apiClient.post('/api/auth/logout');
      
      // Clear tokens from secure storage
      await clearAuthTokens();
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear tokens even if backend call fails
      await clearAuthTokens();
    }
  },

  /**
   * Refresh access token using refresh token
   */
  refreshToken: async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
    try {
      // Backend expects { token: "..." } not { refreshToken: "..." }
      const response = await apiClient.post<BackendLoginResponse>('/api/auth/refresh', {
        token: refreshToken,
      });
      
      return {
        accessToken: response.data.token,
        refreshToken: response.data.token,
      };
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || 'Token refresh failed.';
      throw new Error(message);
    }
  },

  /**
   * Get current user profile
   * Note: Backend doesn't have /api/auth/me endpoint yet
   * This will be implemented when needed
   */
  getCurrentUser: async (): Promise<User> => {
    throw new Error('Get current user endpoint not implemented yet');
  },
};

