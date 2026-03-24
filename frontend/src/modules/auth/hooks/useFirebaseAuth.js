import { useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../../../shared/firebase/firebaseConfig';
import apiClient from '../../../shared/api/client';
import useAuthStore from '../store/auth.store';

/**
 * Hook principal de autenticación con Firebase.
 * Sincroniza el estado de Firebase con el store de Zustand
 * y carga el perfil del usuario desde la API.
 */
export function useFirebaseAuth() {
  const { user, loading, setUser, clearUser, setLoading } = useAuthStore();

  // Escucha cambios de estado de Firebase (login/logout/refresh)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Carga el perfil completo (rol, nombre) desde la DB
          const { data } = await apiClient.get('/auth/me');
          setUser({
            uid:       firebaseUser.uid,
            email:     firebaseUser.email,
            firstName: data.data.first_name,
            lastName:  data.data.last_name,
            role:      data.data.role,
            schoolId:  data.data.school_id,
          });
        } catch {
          // Si /auth/me falla (usuario no creado en DB aún)
          setUser({
            uid:   firebaseUser.uid,
            email: firebaseUser.email,
            role:  null,
          });
        }
      } else {
        clearUser();
      }
    });

    return () => unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email, password) => {
    setLoading(true);
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged se dispara automáticamente y llena el store
  };

  const logout = async () => {
    await signOut(auth);
    clearUser();
  };

  const resetPassword = async (email) => {
    await sendPasswordResetEmail(auth, email);
  };

  return { user, loading, login, logout, resetPassword };
}
