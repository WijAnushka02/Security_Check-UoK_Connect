import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  initialized: false,

  fetchMe: async () => {
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data.user, loading: false, initialized: true });
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      set({ user: null, loading: false, initialized: true });
    }
  },

  logout: async () => {
    let logoutUrl = null;
    try {
      const res = await api.post('/auth/logout');
      if (res.data?.logoutUrl) {
        logoutUrl = res.data.logoutUrl;
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    set({ user: null });
    
    if (logoutUrl) {
      window.location.href = logoutUrl;
    } else {
      window.location.href = '/';
    }
  },

  setUser: (user) => set({ user }),
  clearUser: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    set({ user: null });
  },
}));

export default useAuthStore;