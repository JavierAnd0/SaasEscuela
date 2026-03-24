/**
 * Botón de estado de asistencia.
 * Muestra P / AJ / AI / T con color y permite cambiar el estado con un clic.
 */

const STATUS_CONFIG = {
  present:            { label: 'P',  title: 'Presente',            bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-300',  ring: 'ring-green-500'  },
  absent_justified:   { label: 'AJ', title: 'Ausente Justificado', bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-300',   ring: 'ring-blue-500'   },
  absent_unjustified: { label: 'AI', title: 'Ausente Injustificado', bg: 'bg-red-100',  text: 'text-red-800',    border: 'border-red-300',    ring: 'ring-red-500'    },
  late:               { label: 'T',  title: 'Tardanza',             bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', ring: 'ring-orange-500' },
};

const STATUS_ORDER = ['present', 'absent_unjustified', 'absent_justified', 'late'];

export default function AttendanceStatusButton({ status, onChange, disabled = false }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.present;

  const cycleStatus = () => {
    const idx  = STATUS_ORDER.indexOf(status);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    onChange(next);
  };

  return (
    <button
      type="button"
      onClick={cycleStatus}
      disabled={disabled}
      title={config.title}
      className={`
        w-10 h-10 rounded-lg border-2 font-bold text-xs transition-all
        ${config.bg} ${config.text} ${config.border}
        hover:ring-2 hover:${config.ring}
        disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-95
      `}
    >
      {config.label}
    </button>
  );
}
