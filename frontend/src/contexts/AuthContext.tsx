// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '@/api/apiClient';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // On initial load, check for a valid token and fetch user data
    const initializeAuth = async () => {
      const accessToken = localStorage.getItem('lyzr_access_token');
      if (accessToken) {
        try {
          // Decode token to check for expiry without a server request
          const decoded = jwtDecode(accessToken);
          if (decoded.exp * 1000 > Date.now()) {
            await fetchUserDetails();
          } else {
            // Token is expired
            logout();
          }
        } catch (error) {
          // Token is invalid
          logout();
        }
      }
      setIsLoading(false);
    };
    initializeAuth();
  }, []);

  const fetchUserDetails = async () => {
    try {
      const { data } = await apiClient.get('/me/');
      setUser({
        id: data.id,
        email: data.email,
        name: data.full_name,
        onboardingCompleted: data.onboarding_completed,
      });
    } catch (error) {
      // If fetching user fails, the token might be invalid
      logout();
    }
  };

  const login = async (email, password) => {
    const response = await apiClient.post('/auth/login/', { email, password });
    const { access, refresh } = response.data;

    localStorage.setItem('lyzr_access_token', access);
    localStorage.setItem('lyzr_refresh_token', refresh);
    
    // After successful login, fetch the user's details
    await fetchUserDetails();
  };

  const signup = async (email, password, fullName) => {
    await apiClient.post('/auth/register/', { 
      email, 
      password, 
      full_name: fullName 
    });
    // After successful signup, log the user in automatically
    await login(email, password);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('lyzr_access_token');
    localStorage.removeItem('lyzr_refresh_token');
    // We can also clear react-query cache here if needed
  };

  const value = { user, login, signup, logout, isLoading };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};