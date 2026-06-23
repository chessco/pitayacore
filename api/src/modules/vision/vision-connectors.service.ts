import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { GeminiProvider } from '../../infrastructure/providers/ai/gemini.provider';
import { FalProvider } from '../../infrastructure/providers/image/fal.provider';

@Injectable()
export class VisionConnectorsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly geminiProvider: GeminiProvider,
    private readonly falProvider: FalProvider
  ) {}

  async generateFromConnector(tenantId: string, verticalId: string, inputData: any) {
    // Map verticalId to agent slug
    const agentMap: Record<string, string> = {
      'acuacore': 'aquaculture-educator',
      'mando': 'political-creative',
      'luxuryos': 'luxury-modeler'
    };

    const agentSlug = agentMap[verticalId];
    if (!agentSlug) {
      throw new HttpException('Invalid verticalId', HttpStatus.BAD_REQUEST);
    }

    // Get the agent from the database to get its system prompt
    const agent = await this.db.mysql.agent.findUnique({
      where: { slug: agentSlug }
    });

    if (!agent) {
      throw new HttpException(`Agent ${agentSlug} not found in database. Seed required.`, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Compose the prompt for Gemini
    const userPrompt = `Input details from ${verticalId}: ${JSON.stringify(inputData)}`;

    // 1. Generate visual prompt using Gemini
    let visualPrompt = '';
    try {
      visualPrompt = await this.geminiProvider.generateText(userPrompt, agent.prompt);
    } catch (error) {
      throw new HttpException('Error generating visual prompt with Gemini: ' + error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // 2. Generate Image using FalProvider (FLUX)
    let imageUrl = '';
    try {
      const falResult = await this.falProvider.generateImage(visualPrompt, { image_size: 'landscape_16_9' });
      imageUrl = falResult.imageUrl;
    } catch (error) {
      throw new HttpException('Error generating image with FalProvider: ' + error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // 3. Save as Asset in Database
    const asset = await this.db.mysql.asset.create({
      data: {
        tenantId,
        name: `[${verticalId.toUpperCase()}] Auto-Generated Asset`,
        storagePath: imageUrl,
        storageProvider: 'fal',
        type: 'IMAGE',
        metadata: JSON.stringify({
          verticalId,
          inputData,
          visualPrompt,
          agentSlug
        })
      }
    });

    return {
      message: 'Asset generated successfully via connector',
      asset,
      details: {
        visualPrompt,
        agentUsed: agent.name
      }
    };
  }
}
