import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { useFirebaseAuth } from './modules/auth/hooks/useFirebaseAuth';
import useAuthStore from './modules/auth/store/auth.store';

// Layout y utilidades
import AppLayout     from './shared/layout/AppLayout';
import ProtectedRoute from './shared/layout/ProtectedRoute';

// Páginas auth
import LoginPage          from './modules/auth/pages/LoginPage';
import ForgotPasswordPage from './modules/auth/pages/ForgotPasswordPage';

// Páginas asistencia
import AttendanceEntryPage     from './modules/attendance/pages/AttendanceEntryPage';
import AttendanceDashboardPage from './modules/attendance/pages/AttendanceDashboardPage';

// Páginas notas
import GradeEntryPage from './modules/grades/pages/GradeEntryPage';

// Módulos completados
import UsersPage            from './modules/users/pages/UsersPage';
import DashboardPage        from './modules/dashboard/pages/DashboardPage';
import TeacherDashboardPage from './modules/dashboard/pages/TeacherDashboardPage';
import ConsolidationPage    from './modules/consolidation/pages/ConsolidationPage';
import CommentsPage         from './modules/comments/pages/CommentsPage';
import ReportCardsPage      from './modules/report-cards/pages/ReportCardsPage';
import DeliveryPage         from './modules/delivery/pages/DeliveryPage';
import PublicReportCardPage from './modules/report-cards/pages/PublicReportCardPage';

// Estructura académica y asignaciones
import AcademicSetupPage    from './modules/academic/pages/AcademicSetupPage';
import PeriodsPage          from './modules/academic/pages/PeriodsPage';
import AssignmentsPage      from './modules/assignments/pages/AssignmentsPage';
import CoordinatorGradesPage from './modules/grades/pages/CoordinatorGradesPage';

// Estudiantes
import StudentsPage from './modules/students/pages/StudentsPage';

// Configuración del colegio
import SchoolConfigPage from './modules/config/pages/SchoolConfigPage';

// Páginas de sistema
import SubscriptionRequiredPage from './shared/pages/SubscriptionRequiredPage';

// Superadmin
import SuperadminSchoolsPage from './modules/superadmin/pages/SuperadminSchoolsPage';

// Portal de padres
import PortalLayout              from './modules/portal/layout/PortalLayout';
import PortalLoginPage           from './modules/portal/pages/PortalLoginPage';
import PortalForgotPasswordPage  from './modules/portal/pages/PortalForgotPasswordPage';
import PortalHomePage            from './modules/portal/pages/PortalHomePage';
import PortalStudentPage         from './modules/portal/pages/PortalStudentPage';

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

// Redirect raíz según el rol del usuario
function RootRedirect() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'superadmin') return <Navigate to="/superadmin/schools" replace />;
  if (user.role === 'parent')     return <Navigate to="/portal/home" replace />;
  return <Navigate to="/app/attendance" replace />;
}

export default function App() {
  // Inicializa el listener de Firebase Auth para toda la app
  useFirebaseAuth();

  return (
    <BrowserRouter>
      <Routes>
        {/* ─── Rutas públicas ─────────────────────────── */}
        <Route path="/login"            element={<LoginPage />} />
        <Route path="/forgot-password"  element={<ForgotPasswordPage />} />

        {/* ─── App protegida ──────────────────────────── */}
        <Route
          path="/app"
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'school_admin', 'coordinator', 'teacher']}>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard coordinador/admin */}
          <Route path="dashboard"         element={<DashboardPage />} />
          {/* Dashboard docente */}
          <Route path="teacher/dashboard" element={<TeacherDashboardPage />} />

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

          {/* Estudiantes */}
          <Route path="students"      element={<StudentsPage />} />

          {/* Estructura académica */}
          <Route path="academic"      element={<AcademicSetupPage />} />
          <Route path="periods"       element={<PeriodsPage />} />
          <Route path="assignments"   element={<AssignmentsPage />} />
          <Route path="coordinator/grades" element={<CoordinatorGradesPage />} />

          {/* Admin */}
          <Route path="admin/config"  element={<SchoolConfigPage />} />
          <Route path="admin/users"   element={<UsersPage />} />

          {/* Default redirect */}
          <Route index element={<Navigate to="attendance" replace />} />
        </Route>

        {/* ─── Superadmin ─────────────────────────────── */}
        <Route
          path="/superadmin"
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="schools" element={<SuperadminSchoolsPage />} />
          <Route index element={<Navigate to="schools" replace />} />
        </Route>

        {/* ─── Portal de Padres ───────────────────────── */}
        <Route path="/portal/login"            element={<PortalLoginPage />} />
        <Route path="/portal/forgot-password"  element={<PortalForgotPasswordPage />} />
        <Route
          path="/portal"
          element={
            <ProtectedRoute allowedRoles={['parent']}>
              <PortalLayout />
            </ProtectedRoute>
          }
        >
          <Route path="home"                   element={<PortalHomePage />} />
          <Route path="students/:studentId"    element={<PortalStudentPage />} />
          <Route index element={<Navigate to="home" replace />} />
        </Route>

        {/* Vista pública de boletín para padres */}
        <Route path="/p/:token" element={<PublicReportCardPage />} />

        {/* Suscripción vencida / suspendida */}
        <Route path="/subscription-required" element={<SubscriptionRequiredPage />} />

        {/* Redirect raíz — sensible al rol */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
