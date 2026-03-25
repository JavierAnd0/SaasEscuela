/** Tabs horizontales con scroll para seleccionar la asignación (grupo + materia) del docente */
export default function AssignmentTabs({ assignments, selectedId, onSelect }) {
  if (!assignments.length) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
      {assignments.map((a) => {
        const active = a.assignment_id === selectedId;
        const initial = (a.subject_name || '?').charAt(0).toUpperCase();

        return (
          <button
            key={a.assignment_id}
            onClick={() => onSelect(a)}
            className={`
              flex items-center gap-2.5 flex-shrink-0 px-4 py-2.5 rounded-xl
              text-sm font-medium border transition-all duration-150
              ${active
                ? 'bg-primary-800 text-white border-primary-800 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-700'
              }
            `}
          >
            {/* Inicial de la materia como avatar */}
            <span className={`
              w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
              ${active ? 'bg-primary-700 text-white' : 'bg-primary-100 text-primary-700'}
            `}>
              {initial}
            </span>

            <span className="flex flex-col items-start leading-tight">
              <span className="font-semibold">{a.subject_name}</span>
              <span className={`text-xs ${active ? 'text-primary-200' : 'text-gray-400'}`}>
                {a.classroom_name}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
