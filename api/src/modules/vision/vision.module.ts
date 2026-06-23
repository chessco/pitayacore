import { Module } from '@nestjs/common';
import { VisionController } from './vision.controller';
import { VisionService } from './vision.service';
import { GeminiProvider } from '../../infrastructure/providers/ai/gemini.provider';

@Module({
  controllers: [VisionController],
  providers: [VisionService, GeminiProvider],
})
export class VisionModule {}
