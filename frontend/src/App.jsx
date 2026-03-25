import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { useFirebaseAuth } from './modules/auth/hooks/useFirebaseAuth';

// Layout y utilidades
import AppLayout     from './shared/layout/AppLayout';
import ProtectedRoute from './shared/layout/ProtectedRoute';

// Páginas auth
import LoginPage from './modules/auth/pages/LoginPage';

// Páginas asistencia
import AttendanceEntryPage     from './modules/attendance/pages/AttendanceEntryPage';
import AttendanceDashboardPage from './modules/attendance/pages/AttendanceDashboardPage';

// Páginas notas
import GradeEntryPage from './modules/grades/pages/GradeEntryPage';

// Módulos completados
import UsersPage            from './modules/users/pages/UsersPage';
import DashboardPage        from './modules/dashboard/pages/DashboardPage';
import ConsolidationPage    from './modules/consolidation/pages/ConsolidationPage';
import CommentsPage         from './modules/comments/pages/CommentsPage';
import ReportCardsPage      from './modules/report-cards/pages/ReportCardsPage';
import DeliveryPage         from './modules/delivery/pages/DeliveryPage';
import PublicReportCardPage from './modules/report-cards/pages/PublicReportCardPage';

// Placeholder para módulos futuros
function ComingSoon({ name }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
      <Construction size={48} className="mb-4 text-gray-300" />
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
          <Route path="dashboard"  element={<DashboardPage />} />

          {/* Asistencia */}
          <Route path="attendance"          element={<AttendanceEntryPage />} />
          <Route path="attendance/dashboard" element={<AttendanceDashboardPage />} />

          {/* Notas */}
          <Route path="grades" element={<GradeEntryPage />} />

          {/* Módulos completados */}
          <Route path="consolidation" element={<ConsolidationPage />} />
          <Route path="comments"      element={<CommentsPage />} />
          <Route path="report-cards"  element={<ReportCardsPage />} />
          <Route path="delivery"      element={<DeliveryPage />} />

          {/* Admin */}
          <Route path="admin/config"  element={<ComingSoon name="Configuración del Colegio" />} />
          <Route path="admin/users"   element={<UsersPage />} />

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
        <Route path="/p/:token" element={<PublicReportCardPage />} />

        {/* Redirect raíz */}
        <Route path="/" element={<Navigate to="/app/attendance" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
