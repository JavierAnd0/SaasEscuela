import { useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useFirebaseAuth } from '../../modules/auth/hooks/useFirebaseAuth';

export default function SubscriptionRequiredPage() {
  const { logout } = useFirebaseAuth();
  const navigate   = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-6">
          <ShieldAlert size={32} className="text-amber-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Acceso suspendido
        </h1>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
          El plan de suscripción de su institución ha vencido o ha sido suspendido.
          Comuníquese con el administrador del colegio para reactivar el servicio.
        </p>

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100
                     hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors"
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
