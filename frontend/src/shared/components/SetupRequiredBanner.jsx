import { Link } from 'react-router-dom';
import { Settings, AlertCircle } from 'lucide-react';
import useAuthStore from '../../modules/auth/store/auth.store';

/**
 * Banner que se muestra cuando el colegio no tiene un año académico
 * activo ni períodos configurados. Guía al administrador/coordinador
 * hacia la página de configuración académica.
 */
export default function SetupRequiredBanner() {
  const { user } = useAuthStore();
  const canConfigure = user?.role === 'school_admin' || user?.role === 'coordinator';

  return (
    <div className="card border-amber-200 bg-amber-50 p-8 flex flex-col items-center text-center gap-4">
      <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
        <AlertCircle size={28} className="text-amber-500" />
      </div>

      <div>
        <p className="font-semibold text-gray-900 text-base">
          Sin año académico activo
        </p>
        <p className="text-gray-500 text-sm mt-1 max-w-sm">
          {canConfigure
            ? 'El colegio aún no tiene un año académico ni períodos configurados. Configure el año académico para habilitar esta sección.'
            : 'El colegio aún no tiene un año académico activo. Contacte al administrador o coordinador para que complete la configuración.'}
        </p>
      </div>

      {canConfigure && (
        <Link
          to="/app/admin/config"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                     bg-amber-500 text-white hover:bg-amber-600 transition-colors"
        >
          <Settings size={15} />
          Ir a Configuración
        </Link>
      )}
    </div>
  );
}
