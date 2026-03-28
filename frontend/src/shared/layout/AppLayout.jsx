import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, PenSquare, TrendingUp,
  Sparkles, FileText, Send, Settings, Users, GraduationCap, LogOut,
  BookOpen, UserCog, BarChart2, Menu, CalendarDays,
} from 'lucide-react';
import { useFirebaseAuth } from '../../modules/auth/hooks/useFirebaseAuth';
import useAuthStore from '../../modules/auth/store/auth.store';

const ROLE_MENUS = {
  coordinator: [
    { to: '/app/dashboard',          Icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/app/attendance',         Icon: ClipboardList,   label: 'Asistencia' },
    { to: '/app/coordinator/grades', Icon: BarChart2,       label: 'Notas' },
    { to: '/app/students',           Icon: GraduationCap,   label: 'Estudiantes' },
    { to: '/app/academic',           Icon: BookOpen,        label: 'Estructura Académica' },
    { to: '/app/periods',            Icon: CalendarDays,    label: 'Calendario / Períodos' },
    { to: '/app/assignments',        Icon: UserCog,         label: 'Asignaciones' },
    { to: '/app/admin/users',        Icon: Users,           label: 'Usuarios' },
    { to: '/app/consolidation',      Icon: TrendingUp,      label: 'Consolidación' },
    { to: '/app/comments',           Icon: Sparkles,        label: 'Comentarios IA' },
    { to: '/app/report-cards',       Icon: FileText,        label: 'Boletines' },
    { to: '/app/delivery',           Icon: Send,            label: 'Entrega' },
  ],
  teacher: [
    { to: '/app/teacher/dashboard', Icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/app/attendance',        Icon: ClipboardList,   label: 'Asistencia' },
    { to: '/app/grades',            Icon: PenSquare,       label: 'Notas' },
    { to: '/app/comments',          Icon: Sparkles,        label: 'Mis comentarios' },
  ],
  school_admin: [
    { to: '/app/dashboard',      Icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/app/attendance',     Icon: ClipboardList,   label: 'Asistencia' },
    { to: '/app/students',       Icon: GraduationCap,   label: 'Estudiantes' },
    { to: '/app/academic',       Icon: BookOpen,        label: 'Estructura Académica' },
    { to: '/app/assignments',    Icon: UserCog,         label: 'Asignaciones' },
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
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = ROLE_MENUS[user?.role] || [];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();
  const roleName  = user?.role?.replace('_', ' ') ?? '';

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-body-bg)' }}>

      {/* ─── Sidebar (Materialize semi-dark) ────────────────────────── */}
      <aside
        className="flex-shrink-0 flex flex-col transition-all duration-200 overflow-hidden"
        style={{
          width:           collapsed ? 'var(--menu-width-collapsed)' : 'var(--menu-width)',
          backgroundColor: 'var(--color-menu-bg)',
        }}
      >
        {/* Brand */}
        <div
          className="flex items-center gap-3 px-4 h-16 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <GraduationCap size={16} className="text-white" />
          </div>
          {!collapsed && (
            <span
              className="font-bold text-sm truncate"
              style={{ color: 'var(--color-menu-text)' }}
            >
              SaasColegio
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 mx-3 my-0.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? 'font-medium' : ''
                }`
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                color:           isActive ? '#fff' : 'var(--color-menu-text)',
              })}
              onMouseEnter={e => {
                if (!e.currentTarget.style.backgroundColor.includes('666cff')) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                }
              }}
              onMouseLeave={e => {
                if (!e.currentTarget.style.backgroundColor.includes('666cff')) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <item.Icon size={17} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer: avatar + logout */}
        <div
          className="flex-shrink-0 p-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-2 px-1 mb-2 min-w-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-menu-text)' }}>
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs capitalize truncate" style={{ color: '#7b7d95' }}>
                  {roleName}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            title={collapsed ? 'Cerrar sesión' : undefined}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs transition-colors"
            style={{ color: '#7b7d95' }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.color = 'var(--color-menu-text)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#7b7d95';
            }}
          >
            <LogOut size={15} className="flex-shrink-0" />
            {!collapsed && 'Cerrar sesión'}
          </button>
        </div>
      </aside>

      {/* ─── Main content ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Navbar */}
        <header
          className="flex-shrink-0 flex items-center gap-4 px-6"
          style={{
            height:          'var(--navbar-height)',
            backgroundColor: 'var(--color-card-bg)',
            boxShadow:       '0 1px 0 rgba(38,43,67,0.08)',
          }}
        >
          <button
            onClick={() => setCollapsed(v => !v)}
            className="text-secondary hover:text-base transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
            {new Date().getFullYear()}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
