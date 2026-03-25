import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

/**
 * Public report card page for parents.
 * Redirects to the backend PDF/public endpoint using the access token from the URL.
 */
export default function PublicReportCardPage() {
  const { token } = useParams();

  useEffect(() => {
    if (token) {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
      window.location.replace(`${apiBase}/report-cards/public/${token}`);
    }
  }, [token]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-sm">
        {/* School logo placeholder */}
        <div className="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto mb-6">
          <span className="text-white text-3xl">📄</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Boletín del Estudiante</h1>
        <p className="text-gray-500 text-sm mb-6">
          Redirigiendo a su boletín de calificaciones…
        </p>
        {/* Spinner */}
        <div className="flex justify-center">
          <svg className="animate-spin h-8 w-8 text-primary-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
        {!token && (
          <p className="mt-6 text-sm text-red-600">
            Enlace inválido. Por favor verifique el enlace que recibió por correo.
          </p>
        )}
      </div>
    </div>
  );
}
