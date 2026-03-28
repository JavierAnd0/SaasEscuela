import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.jsx';
import './index.css';

// ─── Sentry: inicializar antes del render ─────────────────────────────────────
// Solo activo cuando VITE_SENTRY_DSN está configurado en .env
Sentry.init({
  dsn:         import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled:     !!import.meta.env.VITE_SENTRY_DSN,
  // 20 % de transacciones en producción; 100 % en desarrollo
  tracesSampleRate:         import.meta.env.PROD ? 0.2 : 1.0,
  // Replay: captura el 10 % de sesiones normales y el 100 % de sesiones con error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      // No enmascarar texto en esta app (datos escolares no ultra-sensibles en UI)
      // Cambiar a maskAllText: true si se requiere máxima privacidad
      maskAllText:    false,
      blockAllMedia:  false,
    }),
  ],
  // No enviar errores de extensiones del navegador
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error exception captured',
  ],
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', gap: '12px',
          fontFamily: 'system-ui, sans-serif', color: '#374151',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>
            Ocurrió un error inesperado
          </p>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>
            El equipo ha sido notificado. Por favor recarga la página.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '8px', padding: '8px 20px', borderRadius: '8px',
              background: '#4F46E5', color: '#fff', border: 'none',
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
            }}
          >
            Recargar página
          </button>
        </div>
      }
    >
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
