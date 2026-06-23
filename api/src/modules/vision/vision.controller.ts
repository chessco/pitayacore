import { Controller, Post, Body } from '@nestjs/common';
import { VisionService } from './vision.service';

@Controller('vision')
export class VisionController {
  constructor(private readonly visionService: VisionService) {}

  @Post('analyze')
  async analyze(@Body() body: { imageUrl: string; prompt?: string }) {
    return this.visionService.analyzeImage(body.imageUrl, body.prompt);
  }
}
