import { useAuthStore } from '../store/authStore.js';

/**
 * useAuth hook (Refactored to use Zustand for V2.1)
 * Hook ini sekarang menggunakan Zustand sebagai state management utama,
 * tetapi tetap menyediakan interface yang sama untuk kompatibilitas.
 */
export default function useAuth() {
  const store = useAuthStore();
  
  return {
    user: store.user,
    login: store.login,
    logout: store.logout,
    loading: store.loading,
    error: store.error,
    fetchUser: store.fetchUser,
    initAuth: store.initAuth
  };
}

