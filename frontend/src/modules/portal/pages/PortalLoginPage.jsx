import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Users } from 'lucide-react';
import { useFirebaseAuth } from '../../auth/hooks/useFirebaseAuth';

export default function PortalLoginPage() {
  const { login }  = useFirebaseAuth();
  const navigate   = useNavigate();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/portal/home');
    } catch (err) {
      const msg = {
        'auth/invalid-credential':    'Email o contraseña incorrectos.',
        'auth/user-not-found':         'No existe una cuenta con ese email.',
        'auth/wrong-password':         'Contraseña incorrecta.',
        'auth/too-many-requests':      'Demasiados intentos. Intente más tarde.',
        'auth/network-request-failed': 'Error de red. Verifique su conexión.',
      }[err.code] || 'Error al iniciar sesión. Intente nuevamente.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-800 to-emerald-600 px-4">
      <div className="w-full max-w-md">
        {/* Marca */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-lg mb-4 relative">
            <GraduationCap size={32} className="text-emerald-700" />
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center">
              <Users size={12} className="text-emerald-700" />
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white">Portal de Padres</h1>
          <p className="text-emerald-200 mt-1 text-sm">Consulte el progreso académico de su hijo(a)</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Ingresar</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="padre@correo.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800
                         text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Ingresando…
                </span>
              ) : 'Ingresar'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link
              to="/portal/forgot-password"
              className="text-sm text-emerald-700 hover:text-emerald-900 hover:underline"
            >
              ¿Olvidó su contraseña?
            </Link>
          </div>
        </div>

        <p className="text-center text-emerald-300 text-xs mt-6">
          SaasColegio — Portal Familiar · Colombia 2026
        </p>
      </div>
    </div>
  );
}
