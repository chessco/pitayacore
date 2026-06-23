import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { VerticalsService } from './verticals.service';

@Controller('verticals')
export class VerticalsController {
  constructor(private readonly verticalsService: VerticalsService) {}

  @Get()
  findAll() {
    return this.verticalsService.findAll();
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.verticalsService.findBySlug(slug);
  }

  @Get('tenant/:tenantId')
  findTenantVerticals(@Param('tenantId') tenantId: string) {
    return this.verticalsService.findTenantVerticals(tenantId);
  }

  @Post('tenant/:tenantId/assign/:verticalId')
  assignVerticalToTenant(
    @Param('tenantId') tenantId: string,
    @Param('verticalId') verticalId: string,
  ) {
    return this.verticalsService.assignVerticalToTenant(tenantId, verticalId);
  }
}
