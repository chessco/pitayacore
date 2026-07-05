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
import { SocialCampaignsService } from './social-campaigns.service';
import { PublisherEngine } from '../publisher/publisher.engine';
import { getTenantId } from '../../../common/tenant/tenant.middleware';
import { CombinedAuthGuard } from '../../../common/guards/combined-auth.guard';
import { FeatureFlagGuard } from '../../../common/guards/feature-flag.guard';
import { RequireFeature } from '../../../common/decorators/require-feature.decorator';

@Controller('api/social/campaigns')
@UseGuards(CombinedAuthGuard, FeatureFlagGuard)
@RequireFeature('SOCIAL_SUITE')
export class SocialCampaignsController {
  constructor(
    private readonly campaignsService: SocialCampaignsService,
    private readonly publisherEngine: PublisherEngine,
  ) {}

  @Post()
  create(@Body() data: any) {
    return this.campaignsService.create(getTenantId(), data);
  }

  @Get()
  findAll() {
    return this.campaignsService.findAll(getTenantId());
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(getTenantId(), id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.campaignsService.update(getTenantId(), id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.campaignsService.remove(getTenantId(), id);
  }

  @Post(':id/generate-content')
  generateContent(
    @Param('id') campaignId: string,
    @Body() body: { brandId: string; contentType: string; title: string; prompt: string },
  ) {
    return this.publisherEngine.generateContentPiece(
      getTenantId(),
      body.brandId,
      campaignId,
      body.contentType,
      body.title,
      body.prompt,
    );
  }
}
