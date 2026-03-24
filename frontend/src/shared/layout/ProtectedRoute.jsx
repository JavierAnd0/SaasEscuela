import { Navigate } from 'react-router-dom';
import useAuthStore from '../../modules/auth/store/auth.store';

/**
 * Protege una ruta verificando:
 * 1. El usuario está autenticado (Firebase)
 * 2. Tiene uno de los roles permitidos
 */
export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-primary-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <span className="text-sm text-gray-500">Verificando sesión…</span>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
}
