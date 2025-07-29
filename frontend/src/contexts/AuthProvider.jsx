import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { jwtDecode } from 'jwt-decode';
import apiClient from '@/api/apiClient';
import { loginUser as apiLogin, registerUser as apiRegister, updateUserDetails } from '@/api';

const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = localStorage.getItem('lyzr_access_token');
    if (!token) return false;
    try {
      const decoded = jwtDecode(token);
      return decoded.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  });

  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ['user'],
    queryFn: () => apiClient.get('/auth/me/').then(res => res.data),
    enabled: isAuthenticated,
    staleTime: Infinity,
    retry: 1,
    onError: () => logout()
  });

  const login = async (email, password) => {
    const { data } = await apiLogin({ email, password });
    localStorage.setItem('lyzr_access_token', data.access);
    localStorage.setItem('lyzr_refresh_token', data.refresh);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.access}`;
    setIsAuthenticated(true);
    await queryClient.invalidateQueries({ queryKey: ['user'] });
  };
  
  const signup = async (email, password, fullName) => {
    await apiRegister({ email, password, full_name: fullName });
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('lyzr_access_token');
    localStorage.removeItem('lyzr_refresh_token');
    delete apiClient.defaults.headers.common['Authorization'];
    setIsAuthenticated(false);
    queryClient.clear();
  };

  const completeOnboarding = async () => {
    try {
        await updateUserDetails({ onboarding_completed: true });
        // Optimistically update the user data in the cache
        queryClient.setQueryData(['user'], (oldData) => ({
            ...oldData,
            onboarding_completed: true,
        }));
    } catch (error) {
        console.error("Failed to update onboarding status", error);
        // If it fails, you could potentially roll back the optimistic update
    }
  };

  const authContextValue = {
    user,
    isAuthenticated,
    isLoading: isLoadingUser,
    login,
    signup,
    logout,
    completeOnboarding,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};