'use strict';

const { z } = require('zod');

// ─── Constantes ────────────────────────────────────────────────────────────────

const DOC_TYPES   = ['TI', 'CC', 'RC', 'CE', 'PA', 'PEP'];
const GENDERS     = ['M', 'F', 'O'];
const DATE_REGEX  = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_REGEX = /^\+?[\d\s\-()]{7,20}$/;

// ─── Campos compartidos ────────────────────────────────────────────────────────

const studentFields = {
  firstName:            z.string().trim().min(1, 'Nombres requeridos').max(100),
  lastName:             z.string().trim().min(1, 'Apellidos requeridos').max(100),
  documentType:         z.enum(DOC_TYPES, { errorMap: () => ({ message: `Tipo de documento inválido. Válidos: ${DOC_TYPES.join(', ')}` }) }).default('TI'),
  documentNumber:       z.string().trim().min(1, 'Número de documento requerido').max(30),
  dateOfBirth:          z.string().regex(DATE_REGEX, 'Formato de fecha inválido. Use YYYY-MM-DD').nullable().optional(),
  gender:               z.enum(GENDERS).nullable().optional(),
  parentName:           z.string().trim().max(200).nullable().optional(),
  parentEmail:          z.string().email('Email del acudiente inválido').max(254).nullable().optional(),
  parentPhone:          z.string().trim().regex(PHONE_REGEX, 'Formato de teléfono inválido').nullable().optional(),
  parentDocumentNumber: z.string().trim().max(30, 'CC del acudiente demasiado largo').nullable().optional(),
};

// ─── Schema: Crear estudiante ─────────────────────────────────────────────────

const CreateStudentSchema = z.object({
  ...studentFields,
  firstName:      studentFields.firstName,
  lastName:       studentFields.lastName,
  documentNumber: studentFields.documentNumber,
}).refine(
  d => !d.parentDocumentNumber || d.parentDocumentNumber.trim() !== d.documentNumber.trim(),
  { message: 'El documento del acudiente no puede ser igual al del estudiante.', path: ['parentDocumentNumber'] }
);

// ─── Schema: Actualizar estudiante (todos opcionales) ─────────────────────────

const UpdateStudentSchema = z.object({
  firstName:            z.string().trim().min(1).max(100).optional(),
  lastName:             z.string().trim().min(1).max(100).optional(),
  documentType:         z.enum(DOC_TYPES).optional(),
  documentNumber:       z.string().trim().min(1).max(30).optional(),
  dateOfBirth:          z.string().regex(DATE_REGEX).nullable().optional(),
  gender:               z.enum(GENDERS).nullable().optional(),
  parentName:           z.string().trim().max(200).nullable().optional(),
  parentEmail:          z.string().email().max(254).nullable().optional(),
  parentPhone:          z.string().trim().regex(PHONE_REGEX).nullable().optional(),
  parentDocumentNumber: z.string().trim().max(30).nullable().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'Se requiere al menos un campo para actualizar.',
}).refine(
  d => !d.parentDocumentNumber || !d.documentNumber || d.parentDocumentNumber.trim() !== d.documentNumber.trim(),
  { message: 'El documento del acudiente no puede ser igual al del estudiante.', path: ['parentDocumentNumber'] }
);

// ─── Schema: Matricular en grupo ──────────────────────────────────────────────

const EnrollSchema = z.object({
  classroomId:    z.string().uuid('classroomId debe ser un UUID válido'),
  academicYearId: z.string().uuid('academicYearId debe ser un UUID válido'),
});

// ─── Schema: Query de listado de estudiantes ──────────────────────────────────

const StudentQuerySchema = z.object({
  classroomId:     z.string().uuid().optional(),
  academicYearId:  z.string().uuid().optional(),
  includeInactive: z.string().optional(),   // '1' | 'true' — se castea en la ruta
  page:            z.coerce.number().int().min(1).default(1),
  limit:           z.coerce.number().int().min(1).max(200).default(50),
  search:          z.string().trim().max(100).optional(),
});

module.exports = {
  CreateStudentSchema,
  UpdateStudentSchema,
  EnrollSchema,
  StudentQuerySchema,
};
