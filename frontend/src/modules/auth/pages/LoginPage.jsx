import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';

export default function LoginPage() {
  const { login } = useFirebaseAuth();
  const navigate  = useNavigate();

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
      navigate('/app/dashboard');
    } catch (err) {
      const msg = {
        'auth/invalid-credential':     'Email o contraseña incorrectos.',
        'auth/user-not-found':          'No existe una cuenta con ese email.',
        'auth/wrong-password':          'Contraseña incorrecta.',
        'auth/too-many-requests':       'Demasiados intentos. Intente más tarde.',
        'auth/network-request-failed':  'Error de red. Verifique su conexión.',
      }[err.code] || 'Error al iniciar sesión. Intente nuevamente.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 to-primary-700 px-4">
      <div className="w-full max-w-md">
        {/* Logo / Marca */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-lg mb-4">
            <span className="text-3xl">🏫</span>
          </div>
          <h1 className="text-3xl font-bold text-white">SaasColegio</h1>
          <p className="text-primary-200 mt-1 text-sm">Sistema de Gestión Académica</p>
        </div>

        {/* Card de login */}
        <div className="card p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Iniciar sesión</h2>

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
                           focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="docente@colegio.edu.co"
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
                           focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
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
            <a
              href="/forgot-password"
              className="text-sm text-primary-700 hover:text-primary-900 hover:underline"
            >
              ¿Olvidó su contraseña?
            </a>
          </div>
        </div>

        <p className="text-center text-primary-300 text-xs mt-6">
          SaasColegio — Colombia 2026 · Normativa Decreto 1290/2009
        </p>
      </div>
    </div>
  );
}
