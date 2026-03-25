'use strict';

/**
 * Factory de middleware de validación con Zod.
 * Previene SQL injection y datos malformados antes de llegar a los repositorios.
 *
 * @param {import('zod').ZodSchema} schema - schema Zod a aplicar
 * @param {'body'|'query'|'params'} source - dónde buscar los datos
 * @returns {function} middleware de Express
 *
 * @example
 * router.post('/attendance/bulk', auth, tenant, validate(BulkAttendanceSchema), controller)
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return res.status(422).json({
        error: 'Datos de entrada inválidos.',
        details: errors,
      });
    }
    // Reemplaza los datos con los valores parseados y sanitizados por Zod
    req[source] = result.data;
    next();
  };
}

module.exports = { validate };
