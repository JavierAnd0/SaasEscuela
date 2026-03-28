import { Outlet, useNavigate } from 'react-router-dom';
import { GraduationCap, LogOut, User } from 'lucide-react';
import { useFirebaseAuth } from '../../auth/hooks/useFirebaseAuth';
import useAuthStore from '../../auth/store/auth.store';

export default function PortalLayout() {
  const { logout } = useFirebaseAuth();
  const { user }   = useAuthStore();
  const navigate   = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/portal/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Top navbar ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Marca */}
          <button
            onClick={() => navigate('/portal/home')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-primary-700 flex items-center justify-center">
              <GraduationCap size={18} className="text-white" />
            </div>
            <span className="font-semibold text-gray-900 text-sm">Portal de Padres</span>
          </button>

          {/* Usuario + logout */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center">
                <User size={14} className="text-primary-700" />
              </div>
              <span className="hidden sm:block font-medium">
                {user ? `${user.firstName} ${user.lastName}` : 'Acudiente'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600
                         px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={15} />
              <span className="hidden sm:block">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── Contenido ──────────────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
