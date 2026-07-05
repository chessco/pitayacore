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
import { SocialAudiencesService } from './social-audiences.service';
import { getTenantId } from '../../../common/tenant/tenant.middleware';
import { CombinedAuthGuard } from '../../../common/guards/combined-auth.guard';
import { FeatureFlagGuard } from '../../../common/guards/feature-flag.guard';
import { RequireFeature } from '../../../common/decorators/require-feature.decorator';

@Controller('api/social/audiences')
@UseGuards(CombinedAuthGuard, FeatureFlagGuard)
@RequireFeature('SOCIAL_SUITE')
export class SocialAudiencesController {
  constructor(private readonly audiencesService: SocialAudiencesService) {}

  @Post()
  create(@Body() data: any) {
    return this.audiencesService.create(getTenantId(), data);
  }

  @Get()
  findAll() {
    return this.audiencesService.findAll(getTenantId());
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.audiencesService.findOne(getTenantId(), id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.audiencesService.update(getTenantId(), id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.audiencesService.remove(getTenantId(), id);
  }
}
