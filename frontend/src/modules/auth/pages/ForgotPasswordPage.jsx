import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';

export default function ForgotPasswordPage() {
  const { resetPassword } = useFirebaseAuth();

  const [email,   setEmail]   = useState('');
  const [status,  setStatus]  = useState('idle'); // 'idle' | 'loading' | 'sent' | 'error'
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
      if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        // No revelar si el email existe o no — respuesta genérica por seguridad
        setStatus('sent');
      } else {
        setErrorMsg('Ocurrió un error inesperado. Intenta de nuevo.');
        setStatus('error');
      }
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #282a42 0%, #3b3d5c 100%)' }}
    >
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <GraduationCap size={24} className="text-white" />
          </div>
          <h1 className="text-white text-xl font-bold tracking-tight">SaasColegio</h1>
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
              <Link
                to="/login"
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
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
                      onChange={e => setEmail(e.target.value)}
                      className="input pl-9"
                      placeholder="usuario@colegio.edu.co"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={status === 'loading' || !email.trim()}
                  className="btn-primary w-full justify-center"
                >
                  {status === 'loading' ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Enviando…
                    </span>
                  ) : 'Enviar enlace de recuperación'}
                </button>
              </form>

              <div className="mt-5 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ArrowLeft size={13} /> Volver al inicio de sesión
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-indigo-300/60 text-xs mt-6">
          SaasColegio — Colombia 2026 · Decreto 1290/2009
        </p>
      </div>
    </div>
  );
}
