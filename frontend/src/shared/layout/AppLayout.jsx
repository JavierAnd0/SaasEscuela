import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, PenSquare, TrendingUp,
  Sparkles, FileText, Send, Settings, Users, GraduationCap, LogOut,
} from 'lucide-react';
import { useFirebaseAuth } from '../../modules/auth/hooks/useFirebaseAuth';
import useAuthStore from '../../modules/auth/store/auth.store';

const ROLE_MENUS = {
  coordinator: [
    { to: '/app/dashboard',      Icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/app/attendance',     Icon: ClipboardList,   label: 'Asistencia' },
    { to: '/app/grades',         Icon: PenSquare,       label: 'Notas' },
    { to: '/app/consolidation',  Icon: TrendingUp,      label: 'Consolidación' },
    { to: '/app/comments',       Icon: Sparkles,        label: 'Comentarios IA' },
    { to: '/app/report-cards',   Icon: FileText,        label: 'Boletines' },
    { to: '/app/delivery',       Icon: Send,            label: 'Entrega' },
  ],
  teacher: [
    { to: '/app/attendance',     Icon: ClipboardList,   label: 'Asistencia' },
    { to: '/app/grades',         Icon: PenSquare,       label: 'Notas' },
    { to: '/app/comments',       Icon: Sparkles,        label: 'Mis comentarios' },
  ],
  school_admin: [
    { to: '/app/dashboard',      Icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/app/attendance',     Icon: ClipboardList,   label: 'Asistencia' },
    { to: '/app/grades',         Icon: PenSquare,       label: 'Notas' },
    { to: '/app/admin/config',   Icon: Settings,        label: 'Configuración' },
    { to: '/app/admin/users',    Icon: Users,           label: 'Usuarios' },
  ],
  superadmin: [
    { to: '/superadmin/schools', Icon: GraduationCap,  label: 'Colegios' },
  ],
};

export default function AppLayout() {
  const { logout }   = useFirebaseAuth();
  const { user }     = useAuthStore();
  const navigate     = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = ROLE_MENUS[user?.role] || [];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ─── Sidebar ─────────────────────────────────────── */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} flex-shrink-0 bg-primary-900 text-white flex flex-col transition-all duration-200`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-primary-800">
          <GraduationCap size={22} className="flex-shrink-0 text-primary-200" />
          {sidebarOpen && <span className="font-bold text-sm truncate">SaasColegio</span>}
        </div>

        {/* Navegación */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
                 ${isActive
                   ? 'bg-primary-700 text-white font-medium'
                   : 'text-primary-200 hover:bg-primary-800 hover:text-white'
                 }`
              }
            >
              <item.Icon size={17} className="flex-shrink-0" />
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer del sidebar */}
        <div className="border-t border-primary-800 p-3">
          <div className="flex items-center gap-2 px-1 mb-2">
            <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 text-xs font-semibold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-primary-300 truncate capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-primary-300 hover:text-white hover:bg-primary-800 rounded-lg transition-colors"
          >
            <LogOut size={15} />
            {sidebarOpen && 'Cerrar sesión'}
          </button>
        </div>
      </aside>

      {/* ─── Contenido principal ─────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TopBar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1" />
          <span className="text-xs text-gray-400">Año 2026</span>
        </header>

        {/* Página activa */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
