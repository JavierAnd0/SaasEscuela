'use strict';

const puppeteer = require('puppeteer');

/**
 * Adaptador de infraestructura para generar PDFs con Puppeteer.
 * Gestiona el ciclo de vida del browser de forma eficiente procesando
 * múltiples páginas en una sola instancia.
 *
 * @param {Array<{ id: string, html: string }>} pages
 * @returns {Promise<Array<{ id: string, buffer: Buffer|null, error: string|null }>>}
 */
class PuppeteerPdfAdapter {
  async generateBatch(pages) {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const results = [];

    try {
      for (const { id, html } of pages) {
        try {
          const page = await browser.newPage();
          await page.setContent(html, { waitUntil: 'networkidle0' });
          const buffer = await page.pdf({
            format:          'A4',
            printBackground: true,
            margin: { top: '10mm', right: '12mm', bottom: '10mm', left: '12mm' },
          });
          await page.close();
          results.push({ id, buffer, error: null });
        } catch (err) {
          results.push({ id, buffer: null, error: err.message });
        }
      }
    } finally {
      await browser.close();
    }

    return results;
  }
}

module.exports = { PuppeteerPdfAdapter };
