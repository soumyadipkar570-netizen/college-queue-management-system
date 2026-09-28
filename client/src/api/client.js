import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cqms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle session expiration cleanly
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Something went wrong. Please try again.';
    
    // Auto-logout if unauthorized or token expired
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('cqms_token');
      localStorage.removeItem('cqms_user');
      window.location.href = '/login?expired=1';
    }

    return Promise.reject({ ...error, message });
  }
);

export default api;
