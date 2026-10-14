import { Controller, Post, Body, UseGuards, Headers } from '@nestjs/common';
import { PredictiveService } from './predictive.service';
import { AiService } from './ai.service';
import { Public } from '../../common/guards/public.decorator';

@Controller('ai')
export class AiController {
  constructor(
    private readonly predictiveService: PredictiveService,
    private readonly aiService: AiService,
  ) {}

  @Post('predictive/insight')
  async getInsight(
    @Headers('x-tenant-id') tenantId: string,
    @Body() data: any,
  ) {
    return this.predictiveService.generateInsight(tenantId, data);
  }

  @Post('analyze-conversation')
  async analyze(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { messages: any[] },
  ) {
    return this.predictiveService.analyzeConversation(body.messages);
  }

  @Public()
  @Post('vision/analyze')
  async analyzeVision(@Body() body: { imageUrl: string; prompt: string }) {
    const response = await this.aiService.analyzeVision(
      body.imageUrl,
      body.prompt,
    );
    return { analysis: response };
  }

  @Public()
  @Post('generate-image')
  async generateImage(@Body() body: { prompt: string }) {
    const url = await this.aiService.generateImage(body.prompt);
    return { url };
  }

  @Public()
  @Post('generate-campaign-text')
  async generateCampaignText(@Body() body: { capsule: any; tone?: string }) {
    return this.aiService.generateCampaignText(body.capsule, body.tone);
  }

  @Public()
  @Post('model')
  async setModel(@Body() body: { model: string }) {
    return this.aiService.setActiveModel(body.model);
  }

  @Public()
  @Post('model/current')
  async getModel() {
    return { model: this.aiService.getActiveModel(), provider: this.aiService.getActiveProvider() };
  }

  @Public()
  @Post('config/get')
  async getConfigPost() {
    return this.aiService.getConfigSummary();
  }

  @Public()
  @Post('config')
  async saveConfig(
    @Body()
    body: {
      provider?: 'gemini' | 'freellmapi';
      model?: string;
      geminiApiKey?: string;
      freellmUrl?: string;
      freellmApiKey?: string;
    },
  ) {
    return this.aiService.saveAiConfig(body);
  }

  @Public()
  @Post('test')
  async testConnection(
    @Body()
    body?: {
      provider?: 'gemini' | 'freellmapi';
      model?: string;
      geminiApiKey?: string;
      freellmUrl?: string;
      freellmApiKey?: string;
    },
  ) {
    return this.aiService.testConnection(body);
  }

  @Public()
  @Post('models')
  async getModels(
    @Body()
    body?: {
      provider?: string;
      url?: string;
      key?: string;
    },
  ) {
    return this.aiService.fetchAvailableModels(body?.provider, body?.url, body?.key);
  }

  @Public()
  @Post('ping')
  async ping() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}

