import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getTenantId } from '../../common/tenant/tenant.middleware';
import { DatabaseService } from '../../common/database/database.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';

import { AI_AGENTS } from './prompts.config';

export type AIProviderType = 'gemini' | 'freellmapi';

export interface TenantAiConfig {
  provider?: 'system' | 'gemini' | 'freellmapi';
  model?: string;
  geminiApiKey?: string;
  freellmUrl?: string;
  freellmApiKey?: string;
}

export interface EffectiveAiConfig {
  provider: AIProviderType;
  model: string;
  geminiApiKey: string;
  freellmUrl: string;
  freellmApiKey: string;
  source: 'tenant' | 'system';
}

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private activeProvider: AIProviderType = 'gemini';
  private activeModel: string = 'gemini-2.5-flash';
  private geminiApiKey: string = '';
  private freellmUrl: string = 'http://llm.pitayacode.io/v1';
  private freellmApiKey: string = '';

  constructor(
    private configService: ConfigService,
    private db: DatabaseService,
    private systemSettings: SystemSettingsService,
  ) {
    // Initial bootstrap from env variables
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || '';
    this.freellmUrl = this.configService.get<string>('FREELLMAPI_URL') || process.env.FREELLMAPI_URL || 'http://llm.pitayacode.io/v1';
    this.freellmApiKey = this.configService.get<string>('FREELLMAPI_API_KEY') || process.env.FREELLMAPI_API_KEY || '';

    if (this.geminiApiKey) {
      this.initGemini(this.geminiApiKey);
    } else {
      this.logger.warn('GEMINI_API_KEY is not defined in environment variables. Can be configured in System Settings.');
    }
  }

  async onModuleInit() {
    await this.reloadConfig();
  }

  private initGemini(key: string) {
    try {
      this.genAI = new GoogleGenerativeAI(key);
      this.logger.log(`Initialized Gemini with key: ${key.substring(0, 5)}...`);
    } catch (e: any) {
      this.logger.error(`Failed to initialize Gemini client: ${e.message}`);
    }
  }

  async reloadConfig() {
    try {
      const settings = await this.systemSettings.getMany([
        'AI_PROVIDER',
        'AI_MODEL',
        'GEMINI_API_KEY',
        'FREELLMAPI_URL',
        'FREELLMAPI_API_KEY',
      ]);

      const dbProvider = settings['AI_PROVIDER'] as AIProviderType;
      if (dbProvider === 'gemini' || dbProvider === 'freellmapi') {
        this.activeProvider = dbProvider;
      }

      const dbGeminiKey = settings['GEMINI_API_KEY'];
      const effectiveGeminiKey = dbGeminiKey || this.configService.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || '';
      if (effectiveGeminiKey && effectiveGeminiKey !== this.geminiApiKey) {
        this.geminiApiKey = effectiveGeminiKey;
        this.initGemini(this.geminiApiKey);
      }

      this.freellmUrl = settings['FREELLMAPI_URL'] || process.env.FREELLMAPI_URL || 'http://llm.pitayacode.io/v1';
      this.freellmApiKey = settings['FREELLMAPI_API_KEY'] || process.env.FREELLMAPI_API_KEY || '';

      if (settings['AI_MODEL']) {
        this.activeModel = settings['AI_MODEL'];
      } else {
        this.activeModel = this.activeProvider === 'freellmapi' ? 'auto' : 'gemini-2.5-flash';
      }

      this.logger.log(
        `AI Configuration reloaded: Provider=${this.activeProvider}, Model=${this.activeModel}, FreeLLMUrl=${this.freellmUrl}`,
      );
    } catch (err: any) {
      this.logger.warn(`Failed to reload AI config from database: ${err.message}`);
    }
  }

  async getEffectiveAiConfig(tenantIdParam?: string): Promise<EffectiveAiConfig> {
    let tenantId = tenantIdParam;
    if (!tenantId) {
      try {
        tenantId = getTenantId();
      } catch {
        tenantId = undefined;
      }
    }

    let provider = this.activeProvider;
    let model = this.activeModel;
    let geminiApiKey = this.geminiApiKey;
    let freellmUrl = this.freellmUrl;
    let freellmApiKey = this.freellmApiKey;
    let source: 'tenant' | 'system' = 'system';

    if (tenantId && tenantId !== 'global' && tenantId !== 'system') {
      try {
        const tenant = await this.db.mysql.tenant.findUnique({
          where: { id: tenantId },
          select: {
            id: true,
            name: true,
            aiConfig: true,
            brandingConfig: true,
          },
        });

        const rawAiConfig = (tenant as any)?.aiConfig || (tenant?.brandingConfig as any)?.aiConfig;
        const aiConfig: TenantAiConfig | null =
          typeof rawAiConfig === 'string' ? JSON.parse(rawAiConfig) : rawAiConfig;

        if (aiConfig && aiConfig.provider && aiConfig.provider !== 'system') {
          provider = aiConfig.provider as AIProviderType;
          source = 'tenant';

          if (aiConfig.model) {
            model = aiConfig.model;
          } else {
            model = provider === 'freellmapi' ? 'auto' : 'gemini-2.5-flash';
          }

          if (aiConfig.freellmUrl) {
            freellmUrl = aiConfig.freellmUrl;
          }
          if (aiConfig.freellmApiKey) {
            freellmApiKey = aiConfig.freellmApiKey;
          }
          if (aiConfig.geminiApiKey) {
            geminiApiKey = aiConfig.geminiApiKey;
          }
        }
      } catch (err: any) {
        this.logger.warn(`Could not resolve tenant AI config for ${tenantId}: ${err.message}`);
      }
    }

    return {
      provider,
      model,
      geminiApiKey,
      freellmUrl,
      freellmApiKey,
      source,
    };
  }

  async generateResponse(
    userMessage: string,
    history: any[] = [],
    modelName?: string,
    systemInstruction?: string,
    channel: string = 'whatsapp',
    tenantIdParam?: string,
  ) {
    let tenantId = tenantIdParam;
    if (!tenantId) {
      try {
        tenantId = getTenantId();
      } catch {
        tenantId = undefined;
      }
    }

    const effectiveConfig = await this.getEffectiveAiConfig(tenantId);
    const selectedModel = modelName || effectiveConfig.model;
    const activeProvider = effectiveConfig.provider;

    const globalRules = `REGLA CRÍTICA DE IDIOMA: Responde SIEMPRE en el mismo idioma que el usuario. Si el usuario habla español, NO uses términos en inglés como "DIAGNOSTIC", "ROOT CAUSE" o "ACTION PLAN". Usa exclusivamente sus equivalentes en español.
    
ADAPTACIÓN DE CANAL: Estás respondiendo a través de: ${channel.toUpperCase()}. 
- Si es WHATSAPP: Sé conciso, usa párrafos cortos y emojis si es apropiado.
- Si es WEB/APP: Sé más estructurado, usa negritas y listas si es necesario.
- Si es API: Entrega información técnica pura y directa.`;
    const basePersona =
      systemInstruction ||
      `Eres PitayaCore AI, un asistente inteligente experto. Tu objetivo es proporcionar consejos precisos, técnicos y útiles.`;
    const activeSystemPrompt = `${basePersona}\n\n${globalRules}`;

    // 1. FREELLMAPI (PitayaCode LLM) Provider
    if (activeProvider === 'freellmapi') {
      try {
        this.logger.log(
          `[AiService] Generating response with PitayaCode LLM (${effectiveConfig.freellmUrl}) for tenant=${tenantId || 'global'}, model: ${selectedModel}...`,
        );

        const messages = [
          { role: 'system', content: activeSystemPrompt },
          ...history.map((h) => ({
            role: h.role === 'user' ? 'user' : 'assistant',
            content: h.content,
          })),
          { role: 'user', content: userMessage },
        ];

        const endpoint = `${effectiveConfig.freellmUrl.replace(/\/+$/, '')}/chat/completions`;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'pitayacore/1.0',
          'X-Agent': 'pitayacore',
          'X-Title': 'pitayacore',
        };
        if (effectiveConfig.freellmApiKey) {
          headers['Authorization'] = `Bearer ${effectiveConfig.freellmApiKey}`;
        }

        const response = await axios.post(
          endpoint,
          {
            model: selectedModel || 'auto',
            messages,
            temperature: 0.7,
          },
          {
            headers,
            timeout: 60000,
          },
        );

        const responseText = response.data?.choices?.[0]?.message?.content || '';
        const confidence = this.calculateConfidence(responseText);

        const promptTokens = response.data?.usage?.prompt_tokens ?? Math.round(userMessage.length / 4);
        const completionTokens = response.data?.usage?.completion_tokens ?? Math.round(responseText.length / 4);

        if (tenantId) {
          await this.trackCost(tenantId, selectedModel, promptTokens, completionTokens);
        }

        return {
          content: responseText,
          confidence,
          isFlagged: confidence < 0.7,
        };
      } catch (error: any) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        this.logger.error(`[AiService] FreeLLMAPI error in generateResponse: ${errorMsg}`);
        throw new Error(`Error con PitayaCode LLM (${effectiveConfig.freellmUrl}): ${errorMsg}`);
      }
    }

    // 2. Google Gemini Provider
    const contents = [
      { role: 'user', parts: [{ text: activeSystemPrompt }] },
      {
        role: 'model',
        parts: [{ text: 'Entendido. Estoy listo para actuar.' }],
      },
      ...history.map((h) => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
      })),
      { role: 'user', parts: [{ text: userMessage }] },
    ];

    try {
      const client = effectiveConfig.geminiApiKey === this.geminiApiKey && this.genAI
        ? this.genAI
        : (effectiveConfig.geminiApiKey ? new GoogleGenerativeAI(effectiveConfig.geminiApiKey) : null);

      if (!client) {
        throw new Error('Gemini API key no está configurada. Asígnala en la Configuración Global o mediante GEMINI_API_KEY.');
      }
      this.logger.log(
        `[AiService] Generating response with Gemini for tenant=${tenantId || 'global'}, model: ${selectedModel}...`,
      );
      const model = client.getGenerativeModel({ model: selectedModel });

      const result = await model.generateContent({
        contents: contents,
      });

      const responseText = result.response.text();
      const confidence = this.calculateConfidence(responseText);

      // Track Cost (Simple simulation)
      if (tenantId) {
        await this.trackCost(
          tenantId,
          selectedModel,
          userMessage.length / 4,
          responseText.length / 4,
        );
      }

      return {
        content: responseText,
        confidence,
        isFlagged: confidence < 0.7,
      };
    } catch (error: any) {
      this.logger.error(`[AiService] Error in generateResponse: ${error.message}`);
      throw error;
    }
  }

  async generateRaw(prompt: string, modelName?: string, tenantIdParam?: string) {
    let tenantId = tenantIdParam;
    if (!tenantId) {
      try {
        tenantId = getTenantId();
      } catch {
        tenantId = undefined;
      }
    }
    const effectiveConfig = await this.getEffectiveAiConfig(tenantId);
    const selectedModel = modelName || effectiveConfig.model;
    const activeProvider = effectiveConfig.provider;

    if (activeProvider === 'freellmapi') {
      try {
        const endpoint = `${effectiveConfig.freellmUrl.replace(/\/+$/, '')}/chat/completions`;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'pitayacore/1.0',
          'X-Agent': 'pitayacore',
          'X-Title': 'pitayacore',
        };
        if (effectiveConfig.freellmApiKey) {
          headers['Authorization'] = `Bearer ${effectiveConfig.freellmApiKey}`;
        }

        const response = await axios.post(
          endpoint,
          {
            model: selectedModel || 'auto',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
          },
          {
            headers,
            timeout: 60000,
          },
        );

        return response.data?.choices?.[0]?.message?.content || '';
      } catch (error: any) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        this.logger.error(`[AiService] FreeLLMAPI error in generateRaw: ${errorMsg}`);
        return '';
      }
    }

    try {
      const client = effectiveConfig.geminiApiKey === this.geminiApiKey && this.genAI
        ? this.genAI
        : (effectiveConfig.geminiApiKey ? new GoogleGenerativeAI(effectiveConfig.geminiApiKey) : null);

      if (!client) {
        this.logger.warn('[AiService] Gemini not initialized in generateRaw');
        return '';
      }
      const model = client.getGenerativeModel({ model: selectedModel || 'gemini-2.5-flash' });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error: any) {
      this.logger.error(`[AiService] Error in generateRaw: ${error.message}`);
      return '';
    }
  }

  async getEmbedding(text: string, tenantIdParam?: string) {
    let tenantId = tenantIdParam;
    if (!tenantId) {
      try {
        tenantId = getTenantId();
      } catch {
        tenantId = undefined;
      }
    }
    const effectiveConfig = await this.getEffectiveAiConfig(tenantId);

    if (effectiveConfig.provider === 'freellmapi') {
      try {
        const endpoint = `${effectiveConfig.freellmUrl.replace(/\/+$/, '')}/embeddings`;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'pitayacore/1.0',
          'X-Agent': 'pitayacore',
          'X-Title': 'pitayacore',
        };
        if (effectiveConfig.freellmApiKey) {
          headers['Authorization'] = `Bearer ${effectiveConfig.freellmApiKey}`;
        }

        const response = await axios.post(
          endpoint,
          {
            model: 'auto',
            input: text,
          },
          {
            headers,
            timeout: 30000,
          },
        );

        const values = response.data?.data?.[0]?.embedding;
        if (Array.isArray(values) && values.length > 0) {
          return values;
        }
      } catch (e: any) {
        this.logger.warn(`FreeLLMAPI embeddings failed: ${e.message}, falling back...`);
      }
    }

    try {
      const client = effectiveConfig.geminiApiKey === this.geminiApiKey && this.genAI
        ? this.genAI
        : (effectiveConfig.geminiApiKey ? new GoogleGenerativeAI(effectiveConfig.geminiApiKey) : null);

      if (client) {
        const model = client.getGenerativeModel({
          model: 'gemini-embedding-001',
        });
        const result = await model.embedContent({
          content: { role: 'user', parts: [{ text }] },
          outputDimensionality: 768,
        } as any);
        return result.embedding.values;
      }
    } catch (e) {
      this.logger.warn('Embedding API failed, using mock embedding (768 dims)');
    }
    return Array(768).fill(0.1);
  }

  async analyzeVision(imageUrl: string, prompt: string, tenantIdParam?: string) {
    let tenantId = tenantIdParam;
    if (!tenantId) {
      try {
        tenantId = getTenantId();
      } catch {
        tenantId = undefined;
      }
    }
    const effectiveConfig = await this.getEffectiveAiConfig(tenantId);

    try {
      this.logger.log(
        `[AiService] Analyzing image from URL: ${imageUrl.substring(0, 50)}...`,
      );
      const client = effectiveConfig.geminiApiKey === this.geminiApiKey && this.genAI
        ? this.genAI
        : (effectiveConfig.geminiApiKey ? new GoogleGenerativeAI(effectiveConfig.geminiApiKey) : null);

      if (!client) {
        throw new Error('Gemini API key no configurada para análisis visual');
      }

      const model = client.getGenerativeModel({ model: effectiveConfig.model });

      let base64Data: string;
      let mimeType: string;

      if (imageUrl.startsWith('data:')) {
        const parts = imageUrl.split(',');
        base64Data = parts[1];
        mimeType = parts[0].split(';')[0].split(':')[1];
      } else {
        const response = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
        });
        base64Data = Buffer.from(response.data).toString('base64');
        mimeType = (response.headers['content-type'] as string) || 'image/jpeg';
      }

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType,
          },
        },
      ]);

      const responseText = result.response.text();
      return responseText;
    } catch (error) {
      this.logger.error(`[AiService] Error in analyzeVision: ${error.message}`);
      throw error;
    }
  }

  async generateImage(prompt: string) {
    this.logger.log(
      `[Nano Banana] Analyzing context for image generation: ${prompt}`,
    );

    // Use Gemini to determine the best keywords for this image
    const keywordsPrompt = `Based on this campaign description: "${prompt}", 
    identify if the topic is primarily: "business", "science", "marketing", "technology", or "general". 
    Return ONLY the category name in lowercase.`;

    const category = (await this.generateRaw(keywordsPrompt))
      .toLowerCase()
      .trim();
    this.logger.log(`[Nano Banana] Category identified: ${category}`);

    const imageMap: Record<string, string> = {
      business:
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200',
      marketing:
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1200',
      science:
        'https://images.unsplash.com/photo-1576086213369-97a306dca665?auto=format&fit=crop&q=80&w=1200',
      technology:
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200',
      general:
        'https://images.unsplash.com/photo-1615147342761-9238e15d8b96?auto=format&fit=crop&q=80&w=1200',
    };

    const imageUrl = imageMap[category] || imageMap.general;
    return imageUrl;
  }

  async generateCampaignText(capsule: any, tone: string = 'professional') {
    const tenantId = getTenantId();
    let prompt = AI_AGENTS.EMAIL_MARKETING.generatePrompt(capsule, tone);

    try {
      // Intentar buscar un agente especializado en la DB para este tenant
      const dbAgent = await this.db.mysql.agent.findFirst({
        where: {
          tenantId: tenantId || undefined,
          slug: 'email-marketing-strategist',
          isActive: true,
        },
      });

      if (dbAgent) {
        this.logger.log(
          `[AiService] Using specialized DB agent: ${dbAgent.name}`,
        );
        // Reemplazar variables en el prompt guardado
        prompt = dbAgent.prompt
          .replace('{{title}}', capsule.title)
          .replace('{{description}}', capsule.description)
          .replace('{{tone}}', tone)
          .replace(
            '{{contextBlocks}}',
            capsule.contentBlocks
              ?.map((b: any) => `- ${b.title || b.type}: ${b.data?.text || ''}`)
              .join('\n') || '',
          );
      }
    } catch (err) {
      this.logger.warn(
        `Failed to fetch specialized agent from DB, falling back to static config: ${err.message}`,
      );
    }

    const result = await this.generateRaw(prompt);
    try {
      // Intentar extraer JSON si hay texto alrededor
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      const cleanJson = jsonMatch ? jsonMatch[0] : result;
      return JSON.parse(cleanJson);
    } catch (e) {
      this.logger.error(
        `Failed to parse AI campaign text: ${e.message}. Result: ${result}`,
      );
      return {
        subject: `[Estrategia] ${capsule.title}`,
        content: `Hola,\n\nTe envío esta nueva cápsula interactiva sobre "${capsule.title}".\n\n${capsule.description}`,
        cta: 'Explorar Cápsula',
      };
    }
  }

  private async trackCost(
    tenantId: string,
    model: string,
    tokensIn: number,
    tokensOut: number,
  ) {
    try {
      if (!tenantId) {
        this.logger.warn(`Skipping cost tracking: No tenantId provided`);
        return;
      }

      const pricePer1k = model.includes('pro') ? 0.0035 : 0.0001;
      const cost = ((tokensIn + tokensOut) / 1000) * pricePer1k;

      await this.db.mysql.aiCostLog.create({
        data: {
          tenantId,
          model,
          tokensIn: Math.round(tokensIn),
          tokensOut: Math.round(tokensOut),
          costUsd: cost,
        },
      });
    } catch (error) {
      // Just log the error but don't fail the request
      console.error(`Failed to track AI cost: ${error.message}`);
    }
  }

  private calculateConfidence(text: string): number {
    // Basic heuristic: check for uncertainty markers
    const uncertaintyMarkers = [
      'maybe',
      'not sure',
      'could be',
      'consult an expert',
      "I don't know",
    ];
    let score = 1.0;
    uncertaintyMarkers.forEach((marker) => {
      if (text.toLowerCase().includes(marker)) {
        score -= 0.2;
      }
    });
    return Math.max(0, score);
  }

  getActiveModel() {
    return this.activeModel;
  }

  setActiveModel(model: string) {
    this.logger.log(`[AiService] Switching global model to: ${model}`);
    this.activeModel = model;
    return { status: 'ok', model: this.activeModel };
  }

  getActiveProvider(): AIProviderType {
    return this.activeProvider;
  }

  setActiveProvider(provider: AIProviderType) {
    this.logger.log(`[AiService] Switching active provider to: ${provider}`);
    this.activeProvider = provider;
    return { status: 'ok', provider: this.activeProvider };
  }

  async getConfigSummary() {
    const envKey = this.configService.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || '';
    const dbGeminiKey = (await this.systemSettings.getSetting('GEMINI_API_KEY')) || '';
    const effectiveGeminiKey = dbGeminiKey || envKey;

    const mask = (k: string) => {
      if (!k || k.length < 8) return k ? '••••••••' : '';
      return `${k.substring(0, 8)}••••••••${k.substring(k.length - 4)}`;
    };

    return {
      provider: this.activeProvider,
      model: this.activeModel,
      gemini: {
        hasEnvKey: Boolean(envKey),
        isConfiguredInDb: Boolean(dbGeminiKey),
        maskedKey: mask(effectiveGeminiKey),
        activeKeySource: dbGeminiKey ? 'DATABASE' : envKey ? 'ENV' : 'NONE',
      },
      freellmapi: {
        url: this.freellmUrl,
        isConfigured: Boolean(this.freellmApiKey),
        maskedKey: mask(this.freellmApiKey),
      },
    };
  }

  async saveAiConfig(dto: {
    provider?: 'gemini' | 'freellmapi';
    model?: string;
    geminiApiKey?: string;
    freellmUrl?: string;
    freellmApiKey?: string;
  }) {
    const updates: Record<string, string> = {};

    if (dto.provider) updates['AI_PROVIDER'] = dto.provider;
    if (dto.model) updates['AI_MODEL'] = dto.model;
    if (dto.geminiApiKey !== undefined) updates['GEMINI_API_KEY'] = dto.geminiApiKey.trim();
    if (dto.freellmUrl !== undefined) updates['FREELLMAPI_URL'] = dto.freellmUrl.trim();
    if (dto.freellmApiKey !== undefined) updates['FREELLMAPI_API_KEY'] = dto.freellmApiKey.trim();

    await this.systemSettings.updateMany(updates);
    await this.reloadConfig();

    return await this.getConfigSummary();
  }

  async testConnection(testConfig?: {
    provider?: 'gemini' | 'freellmapi';
    model?: string;
    geminiApiKey?: string;
    freellmUrl?: string;
    freellmApiKey?: string;
    tenantId?: string;
  }) {
    let effectiveTest = {
      provider: testConfig?.provider || this.activeProvider,
      model: testConfig?.model || this.activeModel,
      geminiApiKey: testConfig?.geminiApiKey !== undefined ? testConfig.geminiApiKey : this.geminiApiKey,
      freellmUrl: testConfig?.freellmUrl || this.freellmUrl,
      freellmApiKey: testConfig?.freellmApiKey !== undefined ? testConfig.freellmApiKey : this.freellmApiKey,
    };

    if (testConfig?.tenantId && !testConfig.provider) {
      const tenantEffective = await this.getEffectiveAiConfig(testConfig.tenantId);
      effectiveTest = {
        provider: tenantEffective.provider,
        model: tenantEffective.model,
        geminiApiKey: tenantEffective.geminiApiKey,
        freellmUrl: tenantEffective.freellmUrl,
        freellmApiKey: tenantEffective.freellmApiKey,
      };
    }

    const provider = effectiveTest.provider;
    const start = Date.now();

    if (provider === 'freellmapi') {
      const url = (effectiveTest.freellmUrl || this.freellmUrl).replace(/\/+$/, '');
      const key = effectiveTest.freellmApiKey !== undefined ? effectiveTest.freellmApiKey : this.freellmApiKey;
      const model = effectiveTest.model || 'auto';

      try {
        const endpoint = `${url}/chat/completions`;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'pitayacore/1.0',
          'X-Agent': 'pitayacore',
          'X-Title': 'pitayacore',
        };
        if (key) {
          headers['Authorization'] = `Bearer ${key}`;
        }

        const res = await axios.post(
          endpoint,
          {
            model,
            messages: [{ role: 'user', content: 'Ping: Responde OK' }],
            max_tokens: 10,
          },
          {
            headers,
            timeout: 15000,
          },
        );
        const latencyMs = Date.now() - start;
        const text = res.data?.choices?.[0]?.message?.content || 'OK';
        return {
          success: true,
          provider: 'freellmapi',
          latencyMs,
          message: `Conexión exitosa a PitayaCode LLM (${url}) en ${latencyMs}ms. Respuesta: "${text.trim().substring(0, 50)}"`,
        };
      } catch (err: any) {
        const latencyMs = Date.now() - start;
        const msg = err.response?.data?.error?.message || err.message;
        return {
          success: false,
          provider: 'freellmapi',
          latencyMs,
          message: `Error al conectar con FreeLLMAPI (${url}): ${msg}`,
        };
      }
    } else {
      // Gemini test
      const envKey = this.configService.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || '';
      const key = effectiveTest.geminiApiKey !== undefined ? effectiveTest.geminiApiKey : (this.geminiApiKey || envKey);
      const modelName = effectiveTest.model || (this.activeProvider === 'gemini' ? this.activeModel : 'gemini-2.5-flash');

      if (!key) {
        return {
          success: false,
          provider: 'gemini',
          latencyMs: 0,
          message: 'No hay API Key configurada para Gemini (ni en base de datos ni en variable de entorno)',
        };
      }
      try {
        const client = new GoogleGenerativeAI(key);
        const model = client.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Ping: responde OK');
        const latencyMs = Date.now() - start;
        const text = result.response.text();
        return {
          success: true,
          provider: 'gemini',
          latencyMs,
          message: `Conexión exitosa a Gemini (${modelName}) en ${latencyMs}ms. Respuesta: "${text.trim().substring(0, 50)}"`,
        };
      } catch (err: any) {
        const latencyMs = Date.now() - start;
        return {
          success: false,
          provider: 'gemini',
          latencyMs,
          message: `Error al conectar con Gemini: ${err.message}`,
        };
      }
    }
  }

  async getTenantAiConfigSummary(tenantId: string) {
    const effective = await this.getEffectiveAiConfig(tenantId);
    let tenantConfig: TenantAiConfig | null = null;
    try {
      const tenant = await this.db.mysql.tenant.findUnique({
        where: { id: tenantId },
        select: { aiConfig: true, brandingConfig: true },
      });
      const raw = (tenant as any)?.aiConfig || (tenant?.brandingConfig as any)?.aiConfig;
      tenantConfig = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {}

    return {
      effective,
      tenantConfig,
    };
  }

  async fetchAvailableModels(providerParam?: string, urlParam?: string, keyParam?: string) {
    const provider = providerParam || this.activeProvider;
    if (provider === 'freellmapi') {
      const url = (urlParam || this.freellmUrl).replace(/\/+$/, '');
      const key = keyParam !== undefined ? keyParam : this.freellmApiKey;
      try {
        const endpoint = `${url}/models`;
        const headers: Record<string, string> = {
          'User-Agent': 'pitayacore/1.0',
          'X-Agent': 'pitayacore',
          'X-Title': 'pitayacore',
        };
        if (key) {
          headers['Authorization'] = `Bearer ${key}`;
        }
        const res = await axios.get(endpoint, {
          headers,
          timeout: 10000,
        });
        const data = res.data?.data || [];
        const models = data.map((m: any) => ({
          id: m.id,
          name: m.name || m.id,
          available: m.available !== false,
        }));
        if (!models.some((m: any) => m.id === 'auto')) {
          models.unshift({ id: 'auto', name: 'auto (Enrutamiento Automático)', available: true });
        }
        return models;
      } catch (err: any) {
        this.logger.warn(`Could not fetch models from FreeLLMAPI: ${err.message}`);
        return [
          { id: 'auto', name: 'auto (Enrutamiento Automático)', available: true },
          { id: 'deepseek-ai/DeepSeek-V3', name: 'deepseek-ai/DeepSeek-V3', available: true },
          { id: 'deepseek-ai/DeepSeek-R1', name: 'deepseek-ai/DeepSeek-R1', available: true },
          { id: 'gpt-4o', name: 'gpt-4o', available: true },
          { id: 'claude-3-5-sonnet-20241022', name: 'claude-3-5-sonnet-20241022', available: true },
        ];
      }
    } else {
      // Gemini models
      return [
        { id: 'gemini-2.5-flash', name: 'gemini-2.5-flash (Predeterminado - Recomendado)', available: true },
        { id: 'gemini-1.5-flash', name: 'gemini-1.5-flash (Ligero y rápido)', available: true },
        { id: 'gemini-1.5-pro', name: 'gemini-1.5-pro (Razonamiento complejo)', available: true },
        { id: 'gemini-2.0-flash', name: 'gemini-2.0-flash (Siguiente generación)', available: true },
      ];
    }
  }
}

