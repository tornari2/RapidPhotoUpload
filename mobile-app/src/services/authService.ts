import apiClient, { setAuthTokens, clearAuthTokens } from './api';
import { LoginRequest, RegisterRequest, AuthResponse, User } from '../types';

/**
 * Authentication service for login, registration, and token management
 */

export const authService = {
  /**
   * Login with email and password
   */
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<AuthResponse>('/api/auth/login', credentials);
      
      // Store tokens in secure storage
      await setAuthTokens(response.data.accessToken, response.data.refreshToken);
      
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      throw new Error(message);
    }
  },

  /**
   * Register a new user
   */
  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<AuthResponse>('/api/auth/register', userData);
      
      // Store tokens in secure storage
      await setAuthTokens(response.data.accessToken, response.data.refreshToken);
      
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      throw new Error(message);
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
      const response = await apiClient.post('/api/auth/refresh', { refreshToken });
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Token refresh failed.';
      throw new Error(message);
    }
  },

  /**
   * Get current user profile
   */
  getCurrentUser: async (): Promise<User> => {
    try {
      const response = await apiClient.get<User>('/api/auth/me');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to get user profile.';
      throw new Error(message);
    }
  },
};

