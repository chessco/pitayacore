import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fal } from '@fal-ai/client';
import {
  IImageProvider,
  ImageGenerationResult,
} from './image.provider.interface';
import axios from 'axios';

@Injectable()
export class FalProvider implements IImageProvider {
  private readonly logger = new Logger(FalProvider.name);

  constructor(private configService: ConfigService) {
    // fal automatically reads FAL_KEY from process.env if available
  }

  async generateImage(
    prompt: string,
    options?: any,
  ): Promise<ImageGenerationResult> {
    this.logger.log(
      `Calling Fal.ai for image generation with prompt: ${prompt}`,
    );

    try {
      const result: any = await fal.subscribe('fal-ai/flux/schnell', {
        input: {
          prompt: prompt,
          image_size: options?.image_size || 'landscape_16_9',
          num_inference_steps: options?.steps || 4,
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === 'IN_PROGRESS' && update.logs) {
            this.logger.log(`Fal.ai progress...`);
          }
        },
      });

      if (
        !result ||
        !result.data ||
        !result.data.images ||
        result.data.images.length === 0
      ) {
        throw new Error('No images returned from Fal.ai');
      }

      const imageUrl = result.data.images[0].url;
      const contentType = result.data.images[0].content_type || 'image/jpeg';
      const width = result.data.images[0].width;
      const height = result.data.images[0].height;

      this.logger.log(`Image generated at Fal.ai: ${imageUrl}`);

      // Fetch binary data to store it internally later
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
      });
      const buffer = Buffer.from(imageResponse.data, 'binary');

      return {
        imageUrl,
        buffer,
        contentType,
        width,
        height,
        prompt,
      };
    } catch (error) {
      this.logger.error('Error calling Fal.ai. Using fallback.', error);

      // Fallback for development if no FAL_KEY is present
      return {
        imageUrl: 'http://localhost:3000/static/safe_streets_banner.png',
        contentType: 'image/png',
        buffer: Buffer.from(''),
        width: 1920,
        height: 1080,
        prompt,
      };
    }
  }
}
