import { Module } from '@nestjs/common';
import { VisionController } from './vision.controller';
import { VisionService } from './vision.service';
import { VisionConnectorsController } from './vision-connectors.controller';
import { VisionConnectorsService } from './vision-connectors.service';
import { GeminiProvider } from '../../infrastructure/providers/ai/gemini.provider';
import { FalProvider } from '../../infrastructure/providers/image/fal.provider';
import { CreditsModule } from '../credits/credits.module';

@Module({
  imports: [CreditsModule],
  controllers: [VisionController, VisionConnectorsController],
  providers: [VisionService, VisionConnectorsService, GeminiProvider, FalProvider],
})
export class VisionModule {}
