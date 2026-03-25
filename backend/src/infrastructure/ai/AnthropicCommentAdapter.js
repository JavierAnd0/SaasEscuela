'use strict';

const Anthropic = require('@anthropic-ai/sdk');

/**
 * Adaptador de infraestructura para generar comentarios de boletín usando la API de Anthropic.
 * Encapsula el detalle del SDK para que el use case no dependa de él directamente.
 */
class AnthropicCommentAdapter {
  constructor() {
    this.anthropic = new Anthropic(); // Lee ANTHROPIC_API_KEY del entorno
  }

  /**
   * Genera un comentario de boletín a partir del prompt dado.
   * @param {string} prompt
   * @returns {Promise<string>} texto del comentario generado
   */
  async generateComment(prompt) {
    const message = await this.anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages:   [{ role: 'user', content: prompt }],
    });
    return message.content[0]?.text?.trim() || '';
  }
}

module.exports = { AnthropicCommentAdapter };
