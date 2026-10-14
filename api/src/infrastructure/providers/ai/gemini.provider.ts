import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { IAiProvider, VisionAnalysisResult } from './ai.provider.interface';
import { SystemSettingsService } from '../../../modules/system-settings/system-settings.service';
import axios from 'axios';

@Injectable()
export class GeminiProvider implements IAiProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  private ai: GoogleGenAI | null = null;
  private currentKey: string = '';

  constructor(
    private configService: ConfigService,
    @Optional() private systemSettings?: SystemSettingsService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.currentKey = apiKey;
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  private async getGenAIClient(): Promise<{ client: GoogleGenAI; model: string }> {
    const dbKey = (await this.systemSettings?.getSetting('GEMINI_API_KEY')) || '';
    const envKey = this.configService.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || '';
    const activeKey = dbKey || envKey;
    const model = (await this.systemSettings?.getSetting('AI_MODEL')) || 'gemini-2.5-flash';

    if (!activeKey) {
      throw new Error('Gemini API key no configurada (ni en BD ni en variables de entorno)');
    }

    if (!this.ai || this.currentKey !== activeKey) {
      this.currentKey = activeKey;
      this.ai = new GoogleGenAI({ apiKey: activeKey });
    }

    return { client: this.ai, model };
  }

  async analyzeImage(
    imageUrl: string,
    prompt: string,
    systemInstruction?: string,
  ): Promise<VisionAnalysisResult> {
    this.logger.log(`Analyzing image from URL: ${imageUrl}`);
    try {
      // Download image as base64
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
      });
      const base64Data = Buffer.from(response.data, 'binary').toString(
        'base64',
      );
      const mimeType =
        (response.headers['content-type'] as string) || 'image/jpeg';

      const config: any = {
        systemInstruction,
      };

      const { client, model } = await this.getGenAIClient();
      const result = await client.models.generateContent({
        model: model || 'gemini-2.5-flash',
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

  async generateText(
    prompt: string,
    systemInstruction?: string,
  ): Promise<string> {
    const provider = (await this.systemSettings?.getSetting('AI_PROVIDER')) || 'gemini';
    if (provider === 'freellmapi') {
      const url = (await this.systemSettings?.getSetting('FREELLMAPI_URL')) || process.env.FREELLMAPI_URL || 'http://llm.pitayacode.io/v1';
      const key = (await this.systemSettings?.getSetting('FREELLMAPI_API_KEY')) || process.env.FREELLMAPI_API_KEY || '';
      const model = (await this.systemSettings?.getSetting('AI_MODEL')) || 'auto';

      const messages: any[] = [];
      if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
      messages.push({ role: 'user', content: prompt });

      const endpoint = `${url.replace(/\/+$/, '')}/chat/completions`;
      const res = await axios.post(endpoint, { model, messages }, {
        headers: key ? { Authorization: `Bearer ${key}` } : {},
        timeout: 60000,
      });
      return res.data?.choices?.[0]?.message?.content || '';
    }

    const { client, model } = await this.getGenAIClient();
    const config: any = { systemInstruction };
    const result = await client.models.generateContent({
      model: model || 'gemini-2.5-flash',
      contents: prompt,
      config,
    });
    return result.text || '';
  }

  async generateStructuredData<T>(
    prompt: string,
    schema: any,
    systemInstruction?: string,
  ): Promise<T> {
    const provider = (await this.systemSettings?.getSetting('AI_PROVIDER')) || 'gemini';
    if (provider === 'freellmapi') {
      const url = (await this.systemSettings?.getSetting('FREELLMAPI_URL')) || process.env.FREELLMAPI_URL || 'http://llm.pitayacode.io/v1';
      const key = (await this.systemSettings?.getSetting('FREELLMAPI_API_KEY')) || process.env.FREELLMAPI_API_KEY || '';
      const model = (await this.systemSettings?.getSetting('AI_MODEL')) || 'auto';

      const promptWithSchema = `${prompt}\n\nIMPORTANT: Respond with pure valid JSON matching this schema: ${JSON.stringify(schema)}. Do not include markdown codeblocks.`;
      const messages: any[] = [];
      if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
      messages.push({ role: 'user', content: promptWithSchema });

      const endpoint = `${url.replace(/\/+$/, '')}/chat/completions`;
      const res = await axios.post(endpoint, {
        model,
        messages,
      }, {
        headers: key ? { Authorization: `Bearer ${key}` } : {},
        timeout: 60000,
      });

      const raw = res.data?.choices?.[0]?.message?.content || '{}';
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        return JSON.parse(jsonMatch ? jsonMatch[0] : raw) as T;
      } catch (e) {
        throw new Error('Invalid JSON response from model');
      }
    }

    const { client, model } = await this.getGenAIClient();
    const config: any = {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: schema,
    };

    const result = await client.models.generateContent({
      model: model || 'gemini-2.5-flash',
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

