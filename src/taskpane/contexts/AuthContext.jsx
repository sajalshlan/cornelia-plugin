import React, { createContext, useContext, useState, useEffect } from 'react';
import { getTokens, storeTokens, clearTokens, isTokenExpired } from '../services/auth';
import api from '../../api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const tokens = getTokens();
    if (tokens && !isTokenExpired(tokens.access)) {
      setIsAuthenticated(true);
      try {
        const response = await api.get('/user/profile/');
        setUser(response.data);
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }
    }
    setIsLoading(false);
  };

  const login = async (username, password) => {
    setAuthError(null); // Clear previous errors
    try {
      const response = await api.post('/token/', {
        username,
        password
      });

      if (response.data.access) {
        storeTokens(response.data);
        setIsAuthenticated(true);
        return { success: true };
      }
      setAuthError('Invalid credentials');
      return { success: false, error: 'Invalid credentials' };
    } catch (error) {
      const errorMessage = error.response?.status === 401 
        ? 'Incorrect username or password'
        : error.response?.data?.detail || 'Login failed';
      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    clearTokens();
    setIsAuthenticated(false);
    setUser(null);
    setAuthError(null);
  };

  const clearError = () => {
    setAuthError(null);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      user,
      login,
      logout,
      checkAuthStatus,
      authError,
      clearError
    }}>
      {children}
    </AuthContext.Provider>
  );
}; 