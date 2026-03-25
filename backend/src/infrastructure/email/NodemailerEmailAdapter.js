'use strict';

const nodemailer = require('nodemailer');

/**
 * Adaptador de infraestructura para envío de correos electrónicos con Nodemailer.
 * Encapsula la configuración SMTP para que el use case no dependa del proveedor.
 */
class NodemailerEmailAdapter {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST || 'smtp.gmail.com',
      port:   parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * @param {{ from: string, to: string, subject: string, html: string, attachments?: object[] }} options
   * @returns {Promise<void>}
   */
  async send({ from, to, subject, html, attachments = [] }) {
    await this.transporter.sendMail({ from, to, subject, html, attachments });
  }
}

module.exports = { NodemailerEmailAdapter };
