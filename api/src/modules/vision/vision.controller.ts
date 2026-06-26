import { Controller, Post, Body, Get } from '@nestjs/common';
import { VisionService } from './vision.service';
import { FalProvider } from '../../infrastructure/providers/image/fal.provider';
import { Public } from '../../common/guards/public.decorator';
import { ConfigService } from '@nestjs/config';
import { fal } from '@fal-ai/client';

@Controller('vision')
export class VisionController {
  constructor(
    private readonly visionService: VisionService,
    private readonly falProvider: FalProvider,
    private readonly configService: ConfigService,
  ) {}

  @Post('analyze')
  async analyze(@Body() body: { imageUrl: string; prompt?: string }) {
    return this.visionService.analyzeImage(body.imageUrl, body.prompt);
  }

  @Public()
  @Get('test-fal')
  async testFal() {
    const falKey = this.configService.get<string>('FAL_KEY');
    const envKey = process.env.FAL_KEY;

    if (!falKey && !envKey) {
      return {
        success: false,
        error: 'FAL_KEY not found in ConfigService or process.env',
        configKey: falKey,
        processKey: envKey,
      };
    }

    try {
      const result = await fal.subscribe('fal-ai/flux/schnell', {
        input: {
          prompt: 'A simple blue circle on white background',
          image_size: 'landscape_16_9',
          num_inference_steps: 4,
        },
      });

      const imageUrl = result?.data?.images?.[0]?.url;
      return {
        success: true,
        imageUrl,
        falKey: falKey?.substring(0, 8) + '...',
        raw: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack,
        falKey: falKey?.substring(0, 8) + '...',
        processKey: envKey?.substring(0, 8) + '...',
      };
    }
  }
}
