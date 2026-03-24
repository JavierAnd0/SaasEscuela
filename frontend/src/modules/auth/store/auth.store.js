import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Store de autenticación — persiste en localStorage para sobrevivir recargas.
 * El estado real de auth siempre se verifica contra Firebase onAuthStateChanged.
 */
const useAuthStore = create(
  persist(
    (set) => ({
      user:     null,   // { uid, email, firstName, lastName, role, schoolId }
      loading:  true,

      setUser: (user) => set({ user, loading: false }),
      clearUser: ()   => set({ user: null, loading: false }),
      setLoading: (v) => set({ loading: v }),
    }),
    {
      name: 'saascolegio-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
);

export default useAuthStore;
