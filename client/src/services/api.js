import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Holds the in-flight refresh request (if any)
let refreshPromise = null;

// Holds the CSRF token
let csrfToken = null;
let csrfPromise = null;

const fetchCsrfToken = () => {
  if (!csrfPromise) {
    csrfPromise = axios
      .get(`${import.meta.env.VITE_API_URL || '/api'}/auth/csrf-token`, { withCredentials: true })
      .then((res) => {
        csrfToken = res.data.token;
      })
      .catch((err) => {
        console.error('Failed to fetch CSRF token', err);
      })
      .finally(() => {
        csrfPromise = null;
      });
  }
  return csrfPromise;
};

// Request interceptor to attach token and CSRF
api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Attach CSRF token for state-changing requests
  const method = (config.method || '').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    if (!csrfToken) {
      await fetchCsrfToken();
    }
    if (csrfToken) {
      config.headers['x-csrf-token'] = csrfToken;
    }
  }

  return config;
});

const refreshAccessToken = () => {
  if (!refreshPromise) {
    const refreshToken = localStorage.getItem('refreshToken');
    refreshPromise = api
      .post('/auth/refresh', { refreshToken })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (res) => {
    if (res.data?.token) {
      localStorage.setItem('token', res.data.token);
    }
    if (res.data?.refreshToken) {
      localStorage.setItem('refreshToken', res.data.refreshToken);
    }
    return res;
  },
  async (err) => {
    const originalRequest = err.config;

    if (err.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url.includes('/auth/refresh')) {
        window.dispatchEvent(new CustomEvent('auth:expired'));
        return Promise.reject(err);
      }

      originalRequest._retry = true;

      try {
        await refreshAccessToken();
        return api(originalRequest);
      } catch (refreshError) {
        window.dispatchEvent(new CustomEvent('auth:expired'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(err);
  }
);

export default api;
