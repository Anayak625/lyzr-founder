// src/api/apiClient.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_REACT_APP_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// This interceptor adds the auth token to every outgoing request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('lyzr_access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// automatically handle token refreshing if an access token expires.

export default apiClient;