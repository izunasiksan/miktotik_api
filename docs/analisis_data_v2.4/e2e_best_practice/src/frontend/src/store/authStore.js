import { create } from 'zustand';
import { login as loginApi, getCurrentUser } from '../services/api.js';
import toast from 'react-hot-toast';

/**
 * AuthStore (02_ARCHITECTURE_STATE.md)
 * Mengelola user info, token, dan roles secara global menggunakan Zustand.
 */
export const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,
  error: null,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  fetchUser: async () => {
    set({ loading: true });
    try {
      const userData = await getCurrentUser();
      set({ user: userData, error: null });
      return userData;
    } catch (error) {
      console.error("Failed to fetch user", error);
      localStorage.removeItem('token');
      set({ user: null, error: error.message });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  initAuth: async () => {
    const token = localStorage.getItem('token');
    if (token) {
      set({ loading: true });
      try {
        await get().fetchUser();
      } catch (error) {
        console.error("Auth initialization failed", error);
      } finally {
        set({ loading: false });
      }
    } else {
      set({ loading: false });
    }
  },

  login: async (username, password, navigate, from = '/') => {
    set({ loading: true, error: null });
    try {
      const data = await loginApi(username, password);
      if (!data.access_token) {
        throw new Error("No access token received");
      }
      localStorage.setItem('token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
      }
      
      // Fetch full user details immediately
      const userData = await get().fetchUser();
      
      if (!userData) {
         const err = new Error("Failed to retrieve user profile");
         err.code = "PROFILE_FETCH_FAILED";
         throw err;
      }

      toast.success('Login successful');
      
      if (navigate) {
        console.log("Login successful, redirecting to:", from);
        navigate(from, { replace: true });
      }
      return true;
    } catch (error) {
      console.error("Login failed in AuthStore", error);
      
      let errorMessage = 'Login gagal';
      const status = error?.response?.status;
      const detail = error?.response?.data?.detail;
      
      if (error?.code === 'ECONNABORTED' || (typeof error?.message === 'string' && error.message.toLowerCase().includes('timeout'))) {
        errorMessage = 'Server tidak merespon (timeout). Pastikan backend aktif dan dapat diakses.';
      } else if (!error?.response) {
        errorMessage = 'Tidak dapat terhubung ke server API. Periksa koneksi dan URL backend.';
      } else if (status === 429) {
        errorMessage = 'Terlalu banyak percobaan. Coba lagi dalam 1 menit.';
      } else if (status === 403 && typeof detail === 'string' && detail.toLowerCase().includes('blacklist')) {
        errorMessage = 'Akses diblokir sementara karena pelanggaran rate limit. Hubungi admin atau tunggu.';
      } else if (status === 400 && detail === 'Inactive user') {
        errorMessage = 'Akun Anda belum diaktifkan. Minta admin mengaktifkan akun Anda.';
      } else if (status === 401 && detail === 'Incorrect username or password') {
        errorMessage = 'Username atau password salah.';
      } else if (error.code === 'PROFILE_FETCH_FAILED') {
        errorMessage = 'Token diterima, tetapi verifikasi profil gagal. Periksa konfigurasi API atau coba ulang.';
      } else if (detail) {
        if (Array.isArray(detail)) {
          errorMessage = detail.map(err => err.msg).join(', ');
        } else if (typeof detail === 'object') {
          try { errorMessage = JSON.stringify(detail); } catch { errorMessage = 'Login gagal'; }
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        }
      }
      
      toast.error(errorMessage);
      set({ error: errorMessage });
      return false;
    }
  },

  logout: (navigate) => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    set({ user: null });
    if (navigate) {
      navigate('/login');
    }
    toast.success('Logged out');
  }
}));
