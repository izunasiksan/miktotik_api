import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login as loginApi, getCurrentUser } from '../services/api.js';
import toast from 'react-hot-toast';
import { AuthContext } from './useAuth.js';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchUser = React.useCallback(async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
      return userData;
    } catch (error) {
      console.error("Failed to fetch user", error);
      localStorage.removeItem('token');
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check for token in localStorage on init
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [fetchUser]);

  const login = React.useCallback(async (username, password) => {
    try {
      const data = await loginApi(username, password);
      if (!data.access_token) {
        throw new Error("No access token received");
      }
      localStorage.setItem('token', data.access_token);
      
      // Fetch full user details immediately
      const userData = await fetchUser();
      
      if (!userData) {
         const err = new Error("Failed to retrieve user profile");
         err.code = "PROFILE_FETCH_FAILED";
         throw err;
      }

      toast.success('Login successful');
      
      // Redirect to where they were trying to go, or home
      const from = location.state?.from?.pathname || '/';
      console.log("Login successful, redirecting to:", from);
      navigate(from, { replace: true });
      return true;
    } catch (error) {
      console.error("Login failed in AuthContext", error);
      
      let errorMessage = 'Login gagal';
      const status = error?.response?.status;
      const detail = error?.response?.data?.detail;
      
      // Prioritize clear, user-friendly messages
      if (status === 429) {
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
      return false;
    }
  }, [fetchUser, location, navigate]);

  const logout = React.useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
    toast.success('Logged out');
  }, [navigate]);

  const value = React.useMemo(() => ({
    user,
    login,
    logout,
    loading
  }), [user, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
