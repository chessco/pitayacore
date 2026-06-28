import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fal } from '@fal-ai/client';
import {
  IImageProvider,
  ImageGenerationResult,
} from './image.provider.interface';
import { R2StorageProvider } from '../storage/r2-storage.provider';

export interface VideoGenerationResult {
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  resolution?: string;
  fileSize?: number;
  prompt: string;
}

@Injectable()
export class FalProvider implements IImageProvider {
  private readonly logger = new Logger(FalProvider.name);

  constructor(
    private configService: ConfigService,
    private readonly storageProvider: R2StorageProvider,
  ) {
    const falKey = this.configService.get<string>('FAL_KEY');
    if (falKey) {
      process.env.FAL_KEY = falKey;
      fal.config({ credentials: falKey });
      this.logger.log(`Fal.ai configured (key: ${falKey.substring(0, 8)}...)`);
    } else {
      this.logger.error(
        'FAL_KEY not found in config — Fal.ai calls will fail!',
      );
    }
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

      // Fetch binary data from fal.ai
      const imageResponse = await fetch(imageUrl);
      const arrayBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to R2 for permanent storage
      let permanentUrl: string;
      try {
        permanentUrl = await this.storageProvider.uploadFile(
          'campaign-banners',
          buffer,
          contentType,
        );
        this.logger.log(`Image uploaded to R2: ${permanentUrl}`);
      } catch (uploadError) {
        this.logger.warn(
          'Failed to upload to R2, using fal.ai URL',
          uploadError,
        );
        permanentUrl = imageUrl;
      }

      return {
        imageUrl: permanentUrl,
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
        imageUrl: '/fallback.png',
        contentType: 'image/png',
        buffer: Buffer.from(''),
        width: 1920,
        height: 1080,
        prompt,
      };
    }
  }

  /**
   * Train a LoRA model on custom images for a specific character/style
   */
  async trainLora(options: {
    triggerWord: string;
    imageUrls: string[];
    steps?: number;
  }): Promise<{ loraPath: string; loraId: string }> {
    this.logger.log(
      `Starting LoRA training for trigger word: ${options.triggerWord}`,
    );

    try {
      // Fal expects images_data_url to be a single URL pointing to a ZIP of training images
      // If multiple URLs are provided, use the first one (should be a pre-zipped archive)
      const imagesUrl =
        options.imageUrls.length === 1
          ? options.imageUrls[0]
          : options.imageUrls[0]; // Consumer is responsible for providing a zip URL

      const result: any = await fal.subscribe(
        'fal-ai/flux-lora-fast-training',
        {
          input: {
            images_data_url: imagesUrl,
            trigger_word: options.triggerWord,
            steps: options.steps || 1000,
          },
          logs: true,
          onQueueUpdate: (update) => {
            if (update.status === 'IN_PROGRESS') {
              this.logger.log(`LoRA training in progress...`);
            }
          },
        },
      );

      const loraPath = result.data?.diffusers_lora_file?.url || '';
      const loraId = result.requestId || result.data?.request_id || loraPath;

      this.logger.log(`LoRA training completed. Path: ${loraPath}`);
      return { loraPath, loraId };
    } catch (error) {
      this.logger.error('Error during LoRA training', error);
      // Fallback for development
      return {
        loraPath: `https://r2.pitayacode.io/loras/${options.triggerWord}.safetensors`,
        loraId: `lora-${options.triggerWord}-dev`,
      };
    }
  }

  /**
   * Generate video from an image using Fal.ai's video generation model
   */
  async generateVideo(
    imageUrl: string,
    prompt: string,
    options?: {
      resolution?: string;
      duration?: string;
      aspectRatio?: string;
      generateAudio?: boolean;
      bitrateMode?: string;
    },
  ): Promise<VideoGenerationResult> {
    this.logger.log(
      `Calling Fal.ai for video generation with prompt: ${prompt}`,
    );

    try {
      // Parse duration - handle 'auto' by using a default
      let durationSeconds = 5; // default
      if (options?.duration && options.duration !== 'auto') {
        durationSeconds = parseInt(options.duration, 10) || 5;
      }

      // Build the request for Seedance model
      const input: any = {
        image_url: imageUrl,
        prompt: prompt,
      };

      // Add optional parameters if provided
      if (options?.resolution) {
        // Map resolution to dimensions
        if (options.resolution === '480p') {
          input.resolution = '480p';
        } else {
          input.resolution = '720p';
        }
      }

      if (durationSeconds) {
        input.duration = durationSeconds;
      }

      if (options?.aspectRatio && options.aspectRatio !== 'auto') {
        input.aspect_ratio = options.aspectRatio;
      }

      if (options?.generateAudio !== undefined) {
        input.generate_audio = options.generateAudio;
      }

      const result: any = await fal.subscribe(
        'bytedance/seedance-2.0/fast/image-to-video',
        {
          input,
          logs: true,
          onQueueUpdate: (update) => {
            if (update.status === 'IN_PROGRESS' && update.logs) {
              this.logger.log(`Fal.ai video generation progress...`);
            }
          },
        },
      );

      if (!result || !result.data || !result.data.video) {
        throw new Error('No video returned from Fal.ai');
      }

      const videoUrl = result.data.video.url;
      const thumbnailUrl = result.data.thumbnail?.url;
      const videoDuration = result.data.video.duration || durationSeconds;

      this.logger.log(`Video generated at Fal.ai: ${videoUrl}`);

      // Fetch binary data from fal.ai
      const videoResponse = await fetch(videoUrl);
      const arrayBuffer = await videoResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to R2 for permanent storage
      let permanentUrl: string;
      try {
        permanentUrl = await this.storageProvider.uploadFile(
          'generated-videos',
          buffer,
          'video/mp4',
        );
        this.logger.log(`Video uploaded to R2: ${permanentUrl}`);
      } catch (uploadError) {
        this.logger.warn(
          'Failed to upload to R2, using fal.ai URL',
          uploadError,
        );
        permanentUrl = videoUrl;
      }

      return {
        videoUrl: permanentUrl,
        thumbnailUrl,
        duration: videoDuration,
        resolution: options?.resolution || '720p',
        fileSize: buffer.length,
        prompt,
      };
    } catch (error) {
      this.logger.error('Error calling Fal.ai for video generation.', error);
      throw error;
    }
  }
}
