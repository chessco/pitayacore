import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getTenantId } from '../../common/tenant/tenant.middleware';
import { DatabaseService } from '../../common/database/database.service';

import { AI_AGENTS } from './prompts.config';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI;
  private activeModel: string = 'gemini-2.5-flash';

  constructor(
    private configService: ConfigService,
    private db: DatabaseService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }
    this.logger.log(`Initializing Gemini with key: ${apiKey.substring(0, 5)}...`);
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateResponse(userMessage: string, history: any[] = [], modelName?: string, systemInstruction?: string, channel: string = 'whatsapp') {
    const selectedModel = modelName || this.activeModel;
    const tenantId = getTenantId();
    const globalRules = `REGLA CRÍTICA DE IDIOMA: Responde SIEMPRE en el mismo idioma que el usuario. Si el usuario habla español, NO uses términos en inglés como "DIAGNOSTIC", "ROOT CAUSE" o "ACTION PLAN". Usa exclusivamente sus equivalentes en español.
    
ADAPTACIÓN DE CANAL: Estás respondiendo a través de: ${channel.toUpperCase()}. 
- Si es WHATSAPP: Sé conciso, usa párrafos cortos y emojis si es apropiado.
- Si es WEB/APP: Sé más estructurado, usa negritas y listas si es necesario.
- Si es API: Entrega información técnica pura y directa.`;
    const basePersona = systemInstruction || `Eres PitayaCore AI, un asistente inteligente experto. Tu objetivo es proporcionar consejos precisos, técnicos y útiles.`;
    const activeSystemPrompt = `${basePersona}\n\n${globalRules}`;

    const contents = [
      { role: 'user', parts: [{ text: activeSystemPrompt }] },
      { role: 'model', parts: [{ text: 'Entendido. Estoy listo para actuar.' }] },
      ...history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
      })),
      { role: 'user', parts: [{ text: userMessage }] }
    ];

    try {
      console.log(`[AiService] Generating response with model ${selectedModel}...`);
      const model = this.genAI.getGenerativeModel({ model: selectedModel });
      
      const result = await model.generateContent({
        contents: contents
      });

      const responseText = result.response.text();
      const confidence = this.calculateConfidence(responseText);

      // Track Cost (Simple simulation)
      await this.trackCost(tenantId, selectedModel, userMessage.length / 4, responseText.length / 4);

      return {
        content: responseText,
        confidence,
        isFlagged: confidence < 0.7,
      };
    } catch (error) {
      console.error(`[AiService] Error in generateResponse: ${error.message}`);
      throw error;
    }
  }

  async generateRaw(prompt: string, modelName: string = 'gemini-2.5-flash') {
    try {
      const model = this.genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error(`[AiService] Error in generateRaw: ${error.message}`);
      return '';
    }
  }

  async getEmbedding(text: string) {
    try {
        const model = this.genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        const result = await model.embedContent({
          content: { role: 'user', parts: [{ text }] },
          outputDimensionality: 768,
        } as any);
        return result.embedding.values;
    } catch(e) {
        console.error("Embedding API failed, using mock embedding (768 dims)");
        return Array(768).fill(0.1);
    }
  }

  async analyzeVision(imageUrl: string, prompt: string) {
    try {
      this.logger.log(`[AiService] Analyzing image from URL: ${imageUrl.substring(0, 50)}...`);
      const model = this.genAI.getGenerativeModel({ model: this.activeModel });
      
      let base64Data: string;
      let mimeType: string;

      if (imageUrl.startsWith('data:')) {
        const parts = imageUrl.split(',');
        base64Data = parts[1];
        mimeType = parts[0].split(';')[0].split(':')[1];
      } else {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        base64Data = Buffer.from(response.data).toString('base64');
        mimeType = (response.headers['content-type'] as string) || 'image/jpeg';
      }

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType
          }
        }
      ]);

      const responseText = result.response.text();
      return responseText;
    } catch (error) {
      this.logger.error(`[AiService] Error in analyzeVision: ${error.message}`);
      throw error;
    }
  }

  async generateImage(prompt: string) {
    this.logger.log(`[Nano Banana] Analyzing context for image generation: ${prompt}`);
    
    // Use Gemini to determine the best keywords for this image
    const keywordsPrompt = `Based on this campaign description: "${prompt}", 
    identify if the topic is primarily: "business", "science", "marketing", "technology", or "general". 
    Return ONLY the category name in lowercase.`;
    
    const category = (await this.generateRaw(keywordsPrompt)).toLowerCase().trim();
    this.logger.log(`[Nano Banana] Category identified: ${category}`);

    const imageMap: Record<string, string> = {
      business: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200", 
      marketing: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1200", 
      science: "https://images.unsplash.com/photo-1576086213369-97a306dca665?auto=format&fit=crop&q=80&w=1200", 
      technology: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200", 
      general: "https://images.unsplash.com/photo-1615147342761-9238e15d8b96?auto=format&fit=crop&q=80&w=1200", 
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
          isActive: true
        }
      });

      if (dbAgent) {
        this.logger.log(`[AiService] Using specialized DB agent: ${dbAgent.name}`);
        // Reemplazar variables en el prompt guardado
        prompt = dbAgent.prompt
          .replace('{{title}}', capsule.title)
          .replace('{{description}}', capsule.description)
          .replace('{{tone}}', tone)
          .replace('{{contextBlocks}}', capsule.contentBlocks?.map((b: any) => `- ${b.title || b.type}: ${b.data?.text || ''}`).join('\n') || '');
      }
    } catch (err) {
      this.logger.warn(`Failed to fetch specialized agent from DB, falling back to static config: ${err.message}`);
    }

    const result = await this.generateRaw(prompt);
    try {
      // Intentar extraer JSON si hay texto alrededor
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      const cleanJson = jsonMatch ? jsonMatch[0] : result;
      return JSON.parse(cleanJson);
    } catch (e) {
      this.logger.error(`Failed to parse AI campaign text: ${e.message}. Result: ${result}`);
      return { 
        subject: `[Estrategia] ${capsule.title}`, 
        content: `Hola,\n\nTe envío esta nueva cápsula interactiva sobre "${capsule.title}".\n\n${capsule.description}`, 
        cta: 'Explorar Cápsula' 
      };
    }
  }

  private async trackCost(tenantId: string, model: string, tokensIn: number, tokensOut: number) {
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
    const uncertaintyMarkers = ['maybe', 'not sure', 'could be', 'consult an expert', 'I don\'t know'];
    let score = 1.0;
    uncertaintyMarkers.forEach(marker => {
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
}
