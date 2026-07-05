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
import { SocialBrandsService } from './social-brands.service';
import { getTenantId } from '../../../common/tenant/tenant.middleware';
import { CombinedAuthGuard } from '../../../common/guards/combined-auth.guard';
import { FeatureFlagGuard } from '../../../common/guards/feature-flag.guard';
import { RequireFeature } from '../../../common/decorators/require-feature.decorator';

@Controller('api/social/brands')
@UseGuards(CombinedAuthGuard, FeatureFlagGuard)
@RequireFeature('SOCIAL_SUITE')
export class SocialBrandsController {
  constructor(private readonly brandsService: SocialBrandsService) {}

  @Post()
  create(@Body() data: any) {
    return this.brandsService.create(getTenantId(), data);
  }

  @Get()
  findAll() {
    return this.brandsService.findAll(getTenantId());
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.brandsService.findOne(getTenantId(), id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.brandsService.update(getTenantId(), id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.brandsService.remove(getTenantId(), id);
  }
}
