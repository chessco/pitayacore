import { Injectable } from '@nestjs/common';
import { AiService } from '../../ai/ai.service';

@Injectable()
export class ThemeGeneratorService {
  constructor(private readonly aiService: AiService) {}

  async generateThemeFromBrand(
    brandDescription: string,
    mode: 'LIGHT' | 'DARK' | 'AUTO' = 'LIGHT',
  ): Promise<any> {
    const prompt = `Act as a Senior UI/UX Architect. Generates a list of Design Tokens for a premium SaaS application in JSON format based on the following brand description: "${brandDescription}".
The output MUST be a valid JSON object without markdown wrappers, matching the following format:
{
  "theme": {
    "name": "Generated Theme",
    "description": "Recommended theme",
    "mode": "${mode}"
  },
  "tokens": [
    { "name": "primary", "value": "#HEX", "type": "color" },
    { "name": "primary-light", "value": "#HEX", "type": "color" },
    { "name": "primary-dark", "value": "#HEX", "type": "color" },
    { "name": "secondary", "value": "#HEX", "type": "color" },
    { "name": "accent", "value": "#HEX", "type": "color" },
    { "name": "background", "value": "#HEX", "type": "color" },
    { "name": "surface", "value": "#HEX", "type": "color" },
    { "name": "text-primary", "value": "#HEX", "type": "color" },
    { "name": "text-secondary", "value": "#HEX", "type": "color" },
    { "name": "border", "value": "#HEX", "type": "color" },
    { "name": "radius", "value": "8px", "type": "radius" },
    { "name": "spacing", "value": "16px", "type": "spacing" }
  ]
}`;

    const rawResponse = await this.aiService.generateResponse(
      prompt,
      [],
      'gemini-2.5-flash',
      'You are a JSON-only designer bot.',
      'api',
    );

    try {
      // Clean potential markdown blocks
      const cleanJson = rawResponse.content
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      // Fallback tokens if parsing fails
      return {
        theme: {
          name: 'Fallback Brand Theme',
          description: 'Generated via fallback due to AI format error',
          mode,
        },
        tokens: [
          { name: 'primary', value: '#10b981', type: 'color' },
          { name: 'primary-light', value: '#34d399', type: 'color' },
          { name: 'primary-dark', value: '#047857', type: 'color' },
          { name: 'secondary', value: '#3b82f6', type: 'color' },
          { name: 'accent', value: '#f59e0b', type: 'color' },
          { name: 'background', value: '#f8fafc', type: 'color' },
          { name: 'surface', value: '#ffffff', type: 'color' },
          { name: 'text-primary', value: '#0f172a', type: 'color' },
          { name: 'text-secondary', value: '#475569', type: 'color' },
          { name: 'border', value: '#e2e8f0', type: 'color' },
          { name: 'radius', value: '12px', type: 'radius' },
          { name: 'spacing', value: '16px', type: 'spacing' },
        ],
      };
    }
  }
}
