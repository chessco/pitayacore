import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../../ai/ai.service';

@Injectable()
export class HumanizerEngine {
  private readonly logger = new Logger(HumanizerEngine.name);

  constructor(private readonly aiService: AiService) {}

  async humanize(
    content: string,
    options: {
      tone?: string;
      personality?: string;
      platform?: string;
      language?: string;
      country?: string;
      ctaStyle?: string;
      allowedEmojis?: string[];
      prohibitedTerms?: string[];
    },
  ): Promise<string> {
    this.logger.log(`Humanizing content for platform: ${options.platform || 'any'}`);

    const tone = options.tone || 'profesional pero cercano';
    const personality = options.personality || 'empático y consultivo';
    const platform = options.platform || 'LINKEDIN';
    const country = options.country || 'México';
    const language = options.language || 'es';
    const ctaStyle = options.ctaStyle || 'conversacional y sutil';
    const allowedEmojis = options.allowedEmojis ? options.allowedEmojis.join(' ') : '👍 🚀 😊';
    const prohibitedTerms = options.prohibitedTerms ? options.prohibitedTerms.join(', ') : 'inteligencia artificial, automatizar, optimizar';

    const systemPrompt = `Actúa como un redactor humano experto y estratega de contenido nativo en redes sociales.
Tu misión es reescribir y humanizar un post generado por IA para que parezca escrito 100% por una persona real, con autenticidad, emoción y ritmo natural.

CRITERIOS DE HUMANIZACIÓN:
1. Variabilidad de enunciados: Combina frases muy cortas e impactantes con explicaciones fluidas. Evita el patrón uniforme y predecible de la IA.
2. Storytelling: Si es apropiado, comienza con una anécdota, analogía o gancho empático.
3. Referencias locales: Adapta el vocabulario a la cultura y expresiones idiomáticas de: ${country}. Si el idioma es español ('es'), usa español natural de esa región sin modismos robóticos.
4. Variación emocional y ritmo: Inserta pausas naturales, preguntas retóricas y cambios de ritmo (usa puntos seguidos para acelerar o comas para pausar).
5. Control de emojis: Utiliza emojis con moderación. Solo usa estos emojis permitidos: [${allowedEmojis}]. NUNCA satures el texto con emojis al inicio de cada línea.
6. Simulación de imperfecciones naturales: Escribe de forma fluida y conversacional, usando transiciones informales ("A ver...", "La verdad es que...", "Para ser honestos...").
7. Estilo de Llamado a la Acción (CTA): Estilo requerido: ${ctaStyle}. Debe sonar integrado orgánicamente, no como un folleto de ventas genérico.
8. Adaptación a la plataforma:
   - Si es LINKEDIN: Enfoque profesional con introspección, lecciones aprendidas y valor práctico. Espaciado limpio.
   - Si es X (TWITTER): Breve, al grano, interactivo, con espacio para debate y sin exceso de hashtags (máximo 1-2).
   - Si es INSTAGRAM/TIKTOK: Más visual, dinámico, enfocado en el hook inicial, ganchos emocionales rápidos y hashtags al final.
   - Si es WHATSAPP_STATUS: Corto, directo, conversacional, con llamado a responder al estado.
9. Palabras prohibidas: Evita absolutamente usar estos términos típicos de IA: [${prohibitedTerms}]. Búscale sinónimos humanos o reescribe la idea de otra forma.

INFORMACIÓN DEL TONO Y PERSONALIDAD:
- Tono: ${tone}
- Personalidad: ${personality}

TEXTO ORIGINAL A HUMANIZAR:
"""
${content}
"""

Entrega únicamente la pieza humanizada final, sin comentarios, sin introducciones ("Aquí tienes tu texto:") ni explicaciones adicionales.`;

    try {
      const response = await this.aiService.generateRaw(systemPrompt, 'gemini-2.5-flash');
      return response.trim();
    } catch (error) {
      this.logger.error('Error humanizing content', error);
      // Fallback to original content on error
      return content;
    }
  }
}
