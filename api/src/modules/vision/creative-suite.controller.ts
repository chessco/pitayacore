import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpException,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { VisionService } from './vision.service';
import {
  FalProvider,
  VideoGenerationResult,
} from '../../infrastructure/providers/image/fal.provider';
import { R2StorageProvider } from '../../infrastructure/providers/storage/r2-storage.provider';
import { CreditsService } from '../credits/credits.service';
import { randomUUID } from 'crypto';

interface VideoGenerationRequest {
  imageUrl: string;
  prompt: string;
  resolution?: string;
  duration?: string;
  aspectRatio?: string;
  generateAudio?: boolean;
  bitrateMode?: string;
  source?: string;
  conversationId?: string;
}

interface VideoJob {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  resolution?: string;
  fileSize?: number;
  error?: string;
  createdAt: number;
}

@Controller('creative-suite')
export class CreativeSuiteController {
  private readonly videoJobs = new Map<string, VideoJob>();

  constructor(
    private readonly visionService: VisionService,
    private readonly falProvider: FalProvider,
    private readonly storageProvider: R2StorageProvider,
    private readonly creditsService: CreditsService,
  ) {}

  @Post('video/generate')
  async generateVideo(
    @Body() body: VideoGenerationRequest,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-api-key') apiKey: string,
  ) {
    if (!body.imageUrl || !body.prompt) {
      throw new HttpException(
        'Missing required fields: imageUrl, prompt',
        HttpStatus.BAD_REQUEST,
      );
    }

    const resolvedTenantId = tenantId || 'DEFAULT_TENANT';
    const jobId = `pc_vid_${Date.now()}_${randomUUID().substring(0, 8)}`;

    this.videoJobs.set(jobId, {
      status: 'pending',
      createdAt: Date.now(),
    });

    try {
      await this.creditsService.deductCredit(
        resolvedTenantId,
        5,
        'Video generation via Creative Suite',
      );
    } catch (creditError) {
      this.videoJobs.delete(jobId);
      throw new HttpException(
        'Insufficient credits for video generation',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    this.processVideoInBackground(jobId, body);

    return {
      jobId,
      status: 'processing',
      message:
        'Video generation started. Poll /creative-suite/video/status/{jobId} for results.',
    };
  }

  @Get('video/status/:jobId')
  getVideoStatus(@Param('jobId') jobId: string) {
    const job = this.videoJobs.get(jobId);
    if (!job) {
      throw new HttpException('Video job not found', HttpStatus.NOT_FOUND);
    }

    const response: any = {
      jobId,
      status: job.status,
    };

    if (job.status === 'completed') {
      response.videoUrl = job.videoUrl;
      response.thumbnailUrl = job.thumbnailUrl;
      response.duration = job.duration;
      response.resolution = job.resolution;
      response.fileSize = job.fileSize;
    }

    if (job.status === 'failed') {
      response.error = job.error;
    }

    return response;
  }

  private async processVideoInBackground(
    jobId: string,
    body: VideoGenerationRequest,
  ) {
    const job = this.videoJobs.get(jobId);
    if (!job) return;

    job.status = 'processing';

    try {
      const result: VideoGenerationResult =
        await this.falProvider.generateVideo(body.imageUrl, body.prompt, {
          resolution: body.resolution || '720p',
          duration: body.duration || 'auto',
          aspectRatio: body.aspectRatio || 'auto',
          generateAudio: body.generateAudio !== false,
          bitrateMode: body.bitrateMode || 'standard',
        });

      job.status = 'completed';
      job.videoUrl = result.videoUrl;
      job.thumbnailUrl = result.thumbnailUrl;
      job.duration = result.duration;
      job.resolution = result.resolution;
      job.fileSize = result.fileSize;
    } catch (error) {
      job.status = 'failed';
      job.error = error.message || 'Video generation failed';
    }
  }
}
