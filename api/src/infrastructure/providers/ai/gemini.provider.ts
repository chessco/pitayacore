import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { IAiProvider, VisionAnalysisResult } from './ai.provider.interface';
import axios from 'axios';

@Injectable()
export class GeminiProvider implements IAiProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  private ai: GoogleGenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.ai = new GoogleGenAI({ apiKey });
  }

  async analyzeImage(imageUrl: string, prompt: string, systemInstruction?: string): Promise<VisionAnalysisResult> {
    this.logger.log(`Analyzing image from URL: ${imageUrl}`);
    try {
      // Download image as base64
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const base64Data = Buffer.from(response.data, 'binary').toString('base64');
      const mimeType = (response.headers['content-type'] as string) || 'image/jpeg';

      const config: any = {
        systemInstruction,
      };

      const result = await this.ai.models.generateContent({
        model: 'gemini-1.5-pro',
        contents: [
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType,
            },
          },
        ],
        config,
      });

      return {
        text: result.text,
        confidenceScore: 0.9,
      };
    } catch (error) {
      this.logger.error('Error analyzing image with Gemini', error);
      throw error;
    }
  }

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    const config: any = { systemInstruction };
    const result = await this.ai.models.generateContent({
      model: 'gemini-1.5-pro',
      contents: prompt,
      config,
    });
    return result.text || '';
  }

  async generateStructuredData<T>(prompt: string, schema: any, systemInstruction?: string): Promise<T> {
    const config: any = {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: schema,
    };
    
    const result = await this.ai.models.generateContent({
      model: 'gemini-1.5-pro',
      contents: prompt,
      config,
    });
    
    try {
      return JSON.parse(result.text || '{}') as T;
    } catch (e) {
      this.logger.error('Failed to parse structured output', e);
      throw new Error('Invalid JSON response from model');
    }
  }
}
