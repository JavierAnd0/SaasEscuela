'use strict';

const { z } = require('zod');

const gradeValueSchema = z
  .number({ invalid_type_error: 'La nota debe ser un número' })
  .min(1.0, 'La nota mínima en Colombia es 1.0')
  .max(5.0, 'La nota máxima en Colombia es 5.0')
  .multipleOf(0.1, 'La nota debe tener máximo 1 decimal');

/**
 * Schema para registro masivo de notas de un grupo
 */
const BulkGradesSchema = z.object({
  classroomId: z.string().uuid(),
  subjectId:   z.string().uuid(),
  periodId:    z.string().uuid(),
  grades: z.array(z.object({
    studentId:  z.string().uuid(),
    gradeValue: gradeValueSchema,
  })).min(1, 'Se requiere al menos 1 nota'),
});

/**
 * Schema para una nota individual
 */
const SingleGradeSchema = z.object({
  studentId:   z.string().uuid(),
  subjectId:   z.string().uuid(),
  classroomId: z.string().uuid(),
  periodId:    z.string().uuid(),
  gradeValue:  gradeValueSchema,
  entryMethod: z.enum(['web', 'csv', 'whatsapp_ocr', 'google_forms']).optional(),
});

/**
 * Schema para query params
 */
const GradeQuerySchema = z.object({
  classroomId: z.string().uuid().optional(),
  subjectId:   z.string().uuid().optional(),
  studentId:   z.string().uuid().optional(),
  periodId:    z.string().uuid().optional(),
});

module.exports = { BulkGradesSchema, SingleGradeSchema, GradeQuerySchema };
