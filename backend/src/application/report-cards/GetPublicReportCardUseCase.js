'use strict';

const path = require('path');
const { NotFoundError } = require('../../presentation/middlewares/errorHandler.middleware');

const STORAGE_DIR = path.join(__dirname, '..', '..', '..', 'storage', 'report-cards');

/**
 * Caso de uso: Acceso público al boletín de un estudiante mediante token único.
 * Retorna la ruta absoluta del archivo PDF para que el controller lo sirva.
 */
class GetPublicReportCardUseCase {
  constructor(reportCardRepo) {
    this.reportCardRepo = reportCardRepo;
  }

  /**
   * @param {string} token
   * @returns {Promise<string>} ruta absoluta del archivo PDF
   */
  async execute(token) {
    const card = await this.reportCardRepo.findByToken(token);
    if (!card) throw new NotFoundError('Boletín no encontrado.');

    // path.basename previene path traversal si pdf_url tuviese segmentos inesperados
    const filePath = path.join(STORAGE_DIR, card.school_id, path.basename(card.pdf_url));
    return filePath;
  }
}

module.exports = { GetPublicReportCardUseCase };
