import { Module } from '@nestjs/common';
import { BrandsController } from './brands/brands.controller';
import { BrandsService } from './brands/brands.service';
import { ThemesController } from './themes/themes.controller';
import { ThemesService } from './themes/themes.service';
import { TokensService } from './design-tokens/tokens.service';
import { ThemeGeneratorService } from './generators/theme-generator.service';
import { ThemeValidatorService } from './validators/theme-validator.service';
import { WhiteLabelController } from './white-label/white-label.controller';
import { WhiteLabelService } from './white-label/white-label.service';
import { AiService } from '../ai/ai.service';

@Module({
  controllers: [BrandsController, ThemesController, WhiteLabelController],
  providers: [
    BrandsService,
    ThemesService,
    TokensService,
    ThemeGeneratorService,
    ThemeValidatorService,
    WhiteLabelService,
    AiService, // For AI-powered generators
  ],
  exports: [BrandsService, ThemesService, TokensService, WhiteLabelService],
})
export class DesignModule {}
