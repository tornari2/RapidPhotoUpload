import React, { createContext, useState, useContext, useEffect, useRef, useCallback, ReactNode } from 'react';
import { getAccessToken, clearAuthTokens } from '../services/api';
import { authService } from '../services/authService';

interface User {
  id: string;
  email: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const hasCheckedAuthRef = useRef(false); // Prevent multiple checkAuth calls

  const checkAuth = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (hasCheckedAuthRef.current) {
      return;
    }
    
    hasCheckedAuthRef.current = true;
    try {
      setIsLoading(true);
      const token = await getAccessToken();

      if (token) {
        // Token exists, but backend doesn't have /api/auth/me endpoint
        // If user is already set (from login), keep it
        // Otherwise, don't set user with empty id - wait for actual login
        setUser((currentUser) => {
          // Only update if user is not already set
          return currentUser || null;
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      // Token might be invalid, clear it
      await clearAuthTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
      hasCheckedAuthRef.current = false;
    }
  }, []); // No dependencies - only run when explicitly called

  useEffect(() => {
    checkAuth();
  }, []); // Only run once on mount

  const login = useCallback((userData: User) => {
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
      // Still clear user state even if logout fails
      setUser(null);
    }
  }, []);

  // Ensure boolean values
  const isAuthenticatedValue = Boolean(user !== null);
  const isLoadingValue = Boolean(isLoading);

  const value: AuthContextType = {
    user,
    isAuthenticated: isAuthenticatedValue,
    isLoading: isLoadingValue,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
