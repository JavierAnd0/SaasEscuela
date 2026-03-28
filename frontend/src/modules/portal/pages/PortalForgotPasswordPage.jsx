import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Users, Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useFirebaseAuth } from '../../auth/hooks/useFirebaseAuth';

/**
 * Página de recuperación de contraseña para el Portal de Padres.
 * Diseño idéntico al PortalLoginPage (fondo verde esmeralda).
 * Misma lógica de Firebase que ForgotPasswordPage del staff,
 * pero accesible desde /portal/forgot-password.
 */
export default function PortalForgotPasswordPage() {
  const { resetPassword } = useFirebaseAuth();

  const [email,    setEmail]    = useState('');
  const [status,   setStatus]   = useState('idle'); // 'idle' | 'loading' | 'sent' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    setErrorMsg('');
    try {
      await resetPassword(email.trim());
      setStatus('sent');
    } catch (err) {
      const code = err.code || '';
      // No revelar si el email existe o no — respuesta genérica por seguridad
      if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        setStatus('sent');
      } else {
        setErrorMsg('Ocurrió un error inesperado. Intenta de nuevo.');
        setStatus('error');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-800 to-emerald-600 px-4">
      <div className="w-full max-w-sm">

        {/* Marca */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-lg mb-4 relative">
            <GraduationCap size={32} className="text-emerald-700" />
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center">
              <Users size={12} className="text-emerald-700" />
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white">Portal de Padres</h1>
          <p className="text-emerald-200 mt-1 text-sm">Recuperar acceso a su cuenta</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          {status === 'sent' ? (
            /* ── Estado: email enviado ── */
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Revisa tu correo</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Si la dirección <strong className="text-gray-700">{email}</strong> tiene una cuenta
                asociada, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
              </p>
              <p className="text-xs text-gray-400 mt-3">
                Revisa también la carpeta de spam o correo no deseado.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Recuerda que tu contraseña inicial es tu número de cédula de ciudadanía.
              </p>
              <Link
                to="/portal/login"
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-900 transition-colors"
              >
                <ArrowLeft size={14} /> Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            /* ── Estado: formulario ── */
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Recuperar contraseña</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Ingresa tu correo y te enviaremos un enlace para restablecerla.
                </p>
              </div>

              {status === 'error' && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-sm text-red-700">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-9 text-sm
                                 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="padre@correo.com"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={status === 'loading' || !email.trim()}
                  className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800
                             text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                             flex items-center justify-center gap-2"
                >
                  {status === 'loading' ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Enviando…
                    </>
                  ) : 'Enviar enlace de recuperación'}
                </button>
              </form>

              <div className="mt-5 text-center">
                <Link
                  to="/portal/login"
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ArrowLeft size={13} /> Volver al inicio de sesión
                </Link>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                <p className="text-xs text-emerald-700 text-center">
                  Tu contraseña inicial es tu número de cédula de ciudadanía.
                  Si nunca la cambiaste, intenta ingresar con ella directamente.
                </p>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-emerald-300 text-xs mt-6">
          SaasColegio — Portal Familiar · Colombia 2026
        </p>
      </div>
    </div>
  );
}
