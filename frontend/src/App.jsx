import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useFirebaseAuth } from './modules/auth/hooks/useFirebaseAuth';

// Layout y utilidades
import AppLayout     from './shared/layout/AppLayout';
import ProtectedRoute from './shared/layout/ProtectedRoute';

// Páginas auth
import LoginPage from './modules/auth/pages/LoginPage';

// Páginas asistencia
import AttendanceEntryPage     from './modules/attendance/pages/AttendanceEntryPage';
import AttendanceDashboardPage from './modules/attendance/pages/AttendanceDashboardPage';

// Placeholder para módulos futuros
function ComingSoon({ name }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
      <span className="text-5xl mb-4">🚧</span>
      <p className="font-medium text-lg">{name}</p>
      <p className="text-sm mt-1">Próximamente disponible</p>
    </div>
  );
}

export default function App() {
  // Inicializa el listener de Firebase Auth para toda la app
  useFirebaseAuth();

  return (
    <BrowserRouter>
      <Routes>
        {/* ─── Rutas públicas ─────────────────────────── */}
        <Route path="/login"            element={<LoginPage />} />
        <Route path="/forgot-password"  element={<ComingSoon name="Recuperar contraseña" />} />

        {/* ─── App protegida ──────────────────────────── */}
        <Route
          path="/app"
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'school_admin', 'coordinator', 'teacher']}>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard coordinador */}
          <Route path="dashboard"  element={<ComingSoon name="Dashboard Coordinador" />} />

          {/* Asistencia */}
          <Route path="attendance"          element={<AttendanceEntryPage />} />
          <Route path="attendance/dashboard" element={<AttendanceDashboardPage />} />

          {/* Notas */}
          <Route path="grades"     element={<ComingSoon name="Ingreso de Notas" />} />

          {/* Módulos futuros */}
          <Route path="consolidation" element={<ComingSoon name="Consolidación y Promedios" />} />
          <Route path="comments"      element={<ComingSoon name="Comentarios IA" />} />
          <Route path="report-cards"  element={<ComingSoon name="Boletines PDF" />} />
          <Route path="delivery"      element={<ComingSoon name="Entrega a Padres" />} />

          {/* Admin */}
          <Route path="admin/config"  element={<ComingSoon name="Configuración del Colegio" />} />
          <Route path="admin/users"   element={<ComingSoon name="Gestión de Usuarios" />} />

          {/* Default redirect */}
          <Route index element={<Navigate to="attendance" replace />} />
        </Route>

        {/* Superadmin */}
        <Route
          path="/superadmin/*"
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <ComingSoon name="Panel Superadmin" />
            </ProtectedRoute>
          }
        />

        {/* Vista pública de boletín para padres */}
        <Route path="/p/:token" element={<ComingSoon name="Boletín del Estudiante" />} />

        {/* Redirect raíz */}
        <Route path="/" element={<Navigate to="/app/attendance" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
