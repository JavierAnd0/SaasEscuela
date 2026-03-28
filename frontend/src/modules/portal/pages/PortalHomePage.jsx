import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ChevronRight, BookOpen, Calendar, AlertCircle } from 'lucide-react';
import portalApi from '../api/portal.api';
import useAuthStore from '../../auth/store/auth.store';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gradeColor(avg) {
  if (!avg) return 'text-gray-400';
  if (avg >= 4.0) return 'text-green-600';
  if (avg >= 3.0) return 'text-amber-600';
  return 'text-red-600';
}

function attendanceColor(rate) {
  if (!rate) return 'text-gray-400';
  if (rate >= 90) return 'text-green-600';
  if (rate >= 75) return 'text-amber-600';
  return 'text-red-600';
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PortalHomePage() {
  const { user }   = useAuthStore();
  const navigate   = useNavigate();

  const [children,  setChildren]  = useState([]);
  const [summaries, setSummaries] = useState({});
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  useEffect(() => {
    async function load() {
      try {
        const { data: res } = await portalApi.getChildren();
        const kids = res.data || [];
        setChildren(kids);

        // Carga resumen del período activo para cada hijo en paralelo
        const results = await Promise.allSettled(
          kids.map(k => portalApi.getSummary(k.id, undefined))
        );
        const map = {};
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') {
            map[kids[i].id] = r.value.data.data;
          }
        });
        setSummaries(map);
      } catch {
        setError('No se pudo cargar la información. Intente nuevamente.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <svg className="animate-spin h-8 w-8 text-emerald-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      </div>
    );
  }

  return (
    <div>
      {/* Saludo */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenido{user?.firstName ? `, ${user.firstName}` : ''}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Consulte el progreso académico de su(s) hijo(s)
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3 text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Sin hijos vinculados */}
      {children.length === 0 && !error && (
        <div className="text-center py-16 text-gray-400">
          <Users size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No hay estudiantes vinculados a su cuenta.</p>
          <p className="text-sm mt-1">Contacte al coordinador del colegio para vincularse.</p>
        </div>
      )}

      {/* Tarjetas de hijos */}
      <div className="space-y-4">
        {children.map(kid => {
          const s  = summaries[kid.id];
          const avg = s?.grade_average;
          const att = s?.attendance?.attendance_rate;

          return (
            <button
              key={kid.id}
              onClick={() => navigate(`/portal/students/${kid.id}`)}
              className="w-full text-left card p-5 hover:shadow-md hover:border-emerald-200
                         transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Avatar inicial */}
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-emerald-700">
                      {kid.first_name[0]}{kid.last_name[0]}
                    </span>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                      {kid.first_name} {kid.last_name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {kid.grade_level_name
                        ? `${kid.grade_level_name} · ${kid.classroom_name}`
                        : 'Sin grupo asignado'}
                      {kid.relationship && (
                        <span className="ml-2 text-gray-400 capitalize">· {kid.relationship}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Mini KPIs + flecha */}
                <div className="flex items-center gap-6">
                  {s && (
                    <>
                      <div className="hidden sm:flex flex-col items-center">
                        <div className={`text-lg font-bold ${gradeColor(avg)}`}>
                          {avg ?? '–'}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <BookOpen size={10} />
                          <span>Promedio</span>
                        </div>
                      </div>
                      <div className="hidden sm:flex flex-col items-center">
                        <div className={`text-lg font-bold ${attendanceColor(att)}`}>
                          {att != null ? `${parseFloat(att).toFixed(0)}%` : '–'}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Calendar size={10} />
                          <span>Asistencia</span>
                        </div>
                      </div>
                    </>
                  )}
                  <ChevronRight size={18} className="text-gray-400 group-hover:text-emerald-600 transition-colors" />
                </div>
              </div>

              {/* Periodo activo label */}
              {s?.period && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-500">
                    {s.period.name}
                  </span>
                  {s.period.is_closed && (
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-600">Período cerrado</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
