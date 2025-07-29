import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_REACT_APP_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('lyzr_access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Check for 401 Unauthorized and that we haven't already retried
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('lyzr_refresh_token');
      
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${import.meta.env.VITE_REACT_APP_API_BASE_URL}/auth/refresh/`, {
            refresh: refreshToken,
          });
          localStorage.setItem('lyzr_access_token', data.access);
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.access}`;
          originalRequest.headers['Authorization'] = `Bearer ${data.access}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh token failed, logout user
          localStorage.removeItem('lyzr_access_token');
          localStorage.removeItem('lyzr_refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
          // No refresh token found, logout user
          localStorage.removeItem('lyzr_access_token');
          localStorage.removeItem('lyzr_refresh_token');
          window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;