import { Module } from '@nestjs/common';
import { VisionController } from './vision.controller';
import { VisionService } from './vision.service';
import { VisionConnectorsController } from './vision-connectors.controller';
import { VisionConnectorsService } from './vision-connectors.service';
import { CreativeSuiteController } from './creative-suite.controller';
import { GeminiProvider } from '../../infrastructure/providers/ai/gemini.provider';
import { FalProvider } from '../../infrastructure/providers/image/fal.provider';
import { R2StorageProvider } from '../../infrastructure/providers/storage/r2-storage.provider';
import { CreditsModule } from '../credits/credits.module';

@Module({
  imports: [CreditsModule],
  controllers: [VisionController, VisionConnectorsController, CreativeSuiteController],
  providers: [VisionService, VisionConnectorsService, GeminiProvider, FalProvider, R2StorageProvider],
})
export class VisionModule {}
