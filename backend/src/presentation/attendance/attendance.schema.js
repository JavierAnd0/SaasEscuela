'use strict';

const { z } = require('zod');

const AttendanceStatusEnum = z.enum([
  'present',
  'absent_justified',
  'absent_unjustified',
  'late',
]);

/**
 * Schema para un registro individual de asistencia
 */
const SingleAttendanceSchema = z.object({
  studentId:     z.string().uuid('studentId debe ser un UUID válido'),
  classroomId:   z.string().uuid('classroomId debe ser un UUID válido'),
  periodId:      z.string().uuid('periodId debe ser un UUID válido'),
  recordDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'recordDate debe ser YYYY-MM-DD'),
  status:        AttendanceStatusEnum,
  justification: z.string().max(500).optional(),
});

/**
 * Schema para registro masivo de un grupo completo
 */
const BulkAttendanceSchema = z.object({
  classroomId: z.string().uuid(),
  periodId:    z.string().uuid(),
  subjectId:   z.string().uuid('subjectId debe ser un UUID válido').optional(),
  recordDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'recordDate debe ser YYYY-MM-DD'),
  records: z.array(z.object({
    studentId:     z.string().uuid(),
    status:        AttendanceStatusEnum,
    justification: z.string().max(500).optional(),
  })).min(1, 'Se requiere al menos 1 registro'),
});

/**
 * Schema para actualizar/justificar un registro
 */
const UpdateAttendanceSchema = z.object({
  status:        AttendanceStatusEnum.optional(),
  justification: z.string().max(500).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'Se requiere al menos un campo para actualizar.',
});

/**
 * Schema para query params de consulta
 */
const AttendanceQuerySchema = z.object({
  classroomId: z.string().uuid().optional(),
  studentId:   z.string().uuid().optional(),
  periodId:    z.string().uuid().optional(),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  threshold:   z.string().regex(/^\d+$/).transform(Number).optional(),
}).refine(
  data => data.classroomId || data.studentId,
  { message: 'Se requiere classroomId o studentId en la consulta.' }
);

module.exports = {
  SingleAttendanceSchema,
  BulkAttendanceSchema,
  UpdateAttendanceSchema,
  AttendanceQuerySchema,
};
