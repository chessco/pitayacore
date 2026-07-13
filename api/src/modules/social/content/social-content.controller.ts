import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { SocialContentService } from './social-content.service';
import { HumanizerEngine } from '../humanizer/humanizer.engine';
import { PublisherEngine } from '../publisher/publisher.engine';
import { DatabaseService } from '../../../common/database/database.service';
import { getTenantId } from '../../../common/tenant/tenant.middleware';
import { CombinedAuthGuard } from '../../../common/guards/combined-auth.guard';
import { FeatureFlagGuard } from '../../../common/guards/feature-flag.guard';
import { RequireFeature } from '../../../common/decorators/require-feature.decorator';

@Controller('api/social/content')
@UseGuards(CombinedAuthGuard, FeatureFlagGuard)
@RequireFeature('SOCIAL_SUITE')
export class SocialContentController {
  constructor(
    private readonly contentService: SocialContentService,
    private readonly humanizerEngine: HumanizerEngine,
    private readonly publisherEngine: PublisherEngine,
    private readonly db: DatabaseService,
  ) {}

  @Post()
  create(@Body() data: any) {
    return this.contentService.create(getTenantId(), data);
  }

  @Get()
  findAll() {
    return this.contentService.findAll(getTenantId());
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contentService.findOne(getTenantId(), id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.contentService.update(getTenantId(), id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contentService.remove(getTenantId(), id);
  }

  @Post(':id/humanize')
  async humanize(@Param('id') id: string) {
    const tenantId = getTenantId();
    const piece = await this.contentService.findOne(tenantId, id);
    const brand = await this.db.mysql.socialBrand.findUnique({
      where: { id: piece.brandId },
    });

    const humanized = await this.humanizerEngine.humanize(
      piece.rawContent || '',
      {
        tone: brand?.tone as string,
        personality: brand?.personality as string,
        platform: 'LINKEDIN',
        country: brand?.country || 'México',
        language: brand?.language || 'es',
        ctaStyle: brand?.ctaStyle || 'conversacional',
        allowedEmojis: (brand?.allowedEmojis as string[]) || undefined,
        prohibitedTerms: (brand?.prohibitedTerms as string[]) || undefined,
      },
    );

    return this.contentService.update(tenantId, id, {
      ...piece,
      humanizedContent: humanized,
    });
  }

  @Post(':id/approve-queue')
  async approveAndQueue(
    @Param('id') id: string,
    @Body() body: { provider: string; scheduledAt: string },
  ) {
    return this.publisherEngine.approveAndQueue(
      getTenantId(),
      id,
      body.provider,
      new Date(body.scheduledAt),
    );
  }
}
