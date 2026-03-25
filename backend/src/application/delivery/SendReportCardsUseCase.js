'use strict';

const path = require('path');
const fs   = require('fs');
const { ValidationError, NotFoundError } = require('../../presentation/middlewares/errorHandler.middleware');

const STORAGE_DIR = path.join(__dirname, '..', '..', '..', 'storage', 'report-cards');

/**
 * Caso de uso: Enviar los boletines por correo electrónico a los padres de familia.
 */
class SendReportCardsUseCase {
  /**
   * @param {import('../../domain/delivery/DeliveryRepository').DeliveryRepository} deliveryRepo
   * @param {{ send(options): Promise<void> }} emailAdapter
   */
  constructor(deliveryRepo, emailAdapter) {
    this.deliveryRepo = deliveryRepo;
    this.emailAdapter = emailAdapter;
  }

  async execute({ schoolId, classroomId, periodId, channel = 'email' }) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new ValidationError('Servicio de email no configurado. Configure SMTP_USER y SMTP_PASS en las variables de entorno.');
    }

    const school = await this.deliveryRepo.findSchool({ schoolId });
    const period = await this.deliveryRepo.findPeriod({ periodId, schoolId });
    if (!period) throw new NotFoundError('Período no encontrado.');

    const cards = await this.deliveryRepo.findGeneratedCards({ schoolId, classroomId, periodId });
    if (!cards.length) {
      throw new ValidationError('No hay boletines generados para este período. Genérelos primero.');
    }

    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
    let sent   = 0;
    let failed = 0;
    const logs = [];

    for (const card of cards) {
      const email = card.parent_email;
      if (!email) {
        logs.push({ studentId: card.student_id, status: 'skipped', error: 'Sin email de acudiente registrado' });
        continue;
      }

      const filePath   = path.join(STORAGE_DIR, schoolId, path.basename(card.pdf_url));
      const fileExists = fs.existsSync(filePath);

      try {
        await this.emailAdapter.send({
          from:    `"${school.name}" <${process.env.SMTP_USER}>`,
          to:      email,
          subject: `Boletín de ${card.first_name} ${card.last_name} — ${period?.name || ''}`,
          html:    this._buildEmailHtml({ school, card, period, baseUrl }),
          attachments: fileExists
            ? [{ filename: `boletin-${card.first_name}-${card.last_name}.pdf`, path: filePath }]
            : [],
        });

        await this.deliveryRepo.logDelivery({
          schoolId, studentId: card.student_id, periodId, channel, status: 'sent', sentAt: new Date(),
        });
        await this.deliveryRepo.updateCardStatus({ cardId: card.card_id, status: 'delivered' });

        sent++;
        logs.push({ studentId: card.student_id, status: 'sent', email });
      } catch (mailErr) {
        failed++;
        await this.deliveryRepo.logDelivery({
          schoolId, studentId: card.student_id, periodId, channel,
          status: 'failed', errorMessage: mailErr.message,
        });
        logs.push({ studentId: card.student_id, status: 'failed', error: mailErr.message });
      }
    }

    return { sent, failed, skipped: cards.length - sent - failed, logs };
  }

  /** @private */
  _buildEmailHtml({ school, card, period, baseUrl }) {
    return `
      <div style="font-family:Arial,sans-serif; max-width:500px; margin:0 auto;">
        <h2 style="color:#1E3A8A;">${school.name}</h2>
        <p>Estimado/a acudiente,</p>
        <p>Le informamos que el boletín académico de <strong>${card.first_name} ${card.last_name}</strong>
           correspondiente al <strong>${period?.name || 'período académico'}</strong> ya está disponible.</p>
        <p>
          <a href="${baseUrl}/p/${card.access_token}"
             style="background:#1E3A8A; color:white; padding:10px 20px; border-radius:6px; text-decoration:none; display:inline-block; margin:10px 0;">
            Ver Boletín en Línea
          </a>
        </p>
        <p style="color:#6b7280; font-size:12px;">
          Este enlace es personal e intransferible. Por favor no lo comparta.
        </p>
        <hr style="border:none; border-top:1px solid #e5e7eb;">
        <p style="color:#9ca3af; font-size:11px;">${school.name} · Sistema de Gestión Académica</p>
      </div>
    `;
  }
}

module.exports = { SendReportCardsUseCase };
