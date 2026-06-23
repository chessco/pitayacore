import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { SocialPostsService } from './social-posts.service';
import { TenantOwnershipGuard } from '../../common/guards/tenant-ownership.guard';

@Controller('tenants/:tenantId/social-posts')
@UseGuards(TenantOwnershipGuard)
export class SocialPostsController {
  constructor(private readonly socialPostsService: SocialPostsService) {}

  @Get()
  findAll(@Param('tenantId') tenantId: string) {
    return this.socialPostsService.findAll(tenantId);
  }

  @Post()
  create(@Param('tenantId') tenantId: string, @Body() data: any) {
    return this.socialPostsService.create(tenantId, data);
  }

  @Delete(':id')
  remove(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.socialPostsService.remove(tenantId, id);
  }
}
