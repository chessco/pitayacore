import { Injectable } from '@nestjs/common';
import { GeminiProvider } from '../../infrastructure/providers/ai/gemini.provider';

@Injectable()
export class VisionService {
  constructor(private readonly geminiProvider: GeminiProvider) {}

  async analyzeImage(imageUrl: string, prompt?: string) {
    const defaultPrompt =
      prompt ||
      'Analiza esta imagen y describe detalladamente lo que ves. Extrae cualquier texto, logos, y provee un contexto visual completo.';
    const systemInstruction =
      'Eres Vision Analyst, un experto en extracción de metadatos visuales, análisis de diseño y OCR.';

    return this.geminiProvider.analyzeImage(
      imageUrl,
      defaultPrompt,
      systemInstruction,
    );
  }
}
