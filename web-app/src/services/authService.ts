import apiClient from './api';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  type: string;
  expiresIn: number;
  userId: string;
  username: string;
}

/**
 * Service for authentication operations
 */
export const authService = {
  /**
   * Register a new user
   */
  async register(username: string, password: string): Promise<LoginResponse> {
    const request: RegisterRequest = { username, password };
    const response = await apiClient.post<LoginResponse>('/auth/register', request);
    return response.data;
  },

  /**
   * Login with username and password
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    const request: LoginRequest = { username, password };
    const response = await apiClient.post<LoginResponse>('/auth/login', request);
    return response.data;
  },

  /**
   * Refresh JWT token
   */
  async refreshToken(token: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/refresh', {
      token,
    });
    return response.data;
  },
};

