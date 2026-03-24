import { useState } from 'react';
import AttendanceStatusButton from './AttendanceStatusButton';

/**
 * Tabla de asistencia de un grupo para una fecha.
 * Cada fila es un estudiante. Clic en el botón de estado lo rota.
 * Al final, el docente presiona "Guardar" para enviar todo de una vez.
 */
export default function AttendanceGrid({ students, initialRecords = {}, onSave, saving }) {
  // { studentId: 'present' | 'absent_justified' | 'absent_unjustified' | 'late' }
  const [attendance, setAttendance] = useState(() => {
    const defaults = {};
    students.forEach(s => {
      defaults[s.id] = initialRecords[s.id] || 'present';
    });
    return defaults;
  });

  const handleChange = (studentId, newStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: newStatus }));
  };

  const handleMarkAll = (status) => {
    const all = {};
    students.forEach(s => { all[s.id] = status; });
    setAttendance(all);
  };

  const handleSave = () => {
    const records = students.map(s => ({
      studentId: s.id,
      status:    attendance[s.id],
    }));
    onSave(records);
  };

  // Conteos para el resumen rápido
  const counts = Object.values(attendance).reduce((acc, s) => {
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      {/* ─── Acciones rápidas ─── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-sm text-gray-500 mr-1">Marcar todos:</span>
        <button onClick={() => handleMarkAll('present')}            className="badge-presente cursor-pointer hover:opacity-80 px-3 py-1">Todos presentes</button>
        <button onClick={() => handleMarkAll('absent_unjustified')} className="badge-injustificada cursor-pointer hover:opacity-80 px-3 py-1">Todos ausentes</button>
      </div>

      {/* ─── Resumen ─── */}
      <div className="flex gap-3 mb-4 text-sm">
        <span className="badge-presente">P: {counts.present || 0}</span>
        <span className="badge-injustificada">AI: {counts.absent_unjustified || 0}</span>
        <span className="badge-justificada">AJ: {counts.absent_justified || 0}</span>
        <span className="badge-tardanza">T: {counts.late || 0}</span>
      </div>

      {/* ─── Tabla ─── */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600 w-8">#</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Estudiante</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Documento</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.map((student, idx) => (
              <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2.5 text-gray-400 text-xs">{idx + 1}</td>
                <td className="px-4 py-2.5 font-medium text-gray-900">
                  {student.last_name}, {student.first_name}
                </td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">
                  {student.document_type} {student.document_number}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <AttendanceStatusButton
                    status={attendance[student.id]}
                    onChange={(s) => handleChange(student.id, s)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── Guardar ─── */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Guardando…
            </span>
          ) : `Guardar asistencia (${students.length} estudiantes)`}
        </button>
      </div>
    </div>
  );
}
