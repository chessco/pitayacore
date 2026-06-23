import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { SkillsService } from './skills.service';
import { CombinedAuthGuard } from '../../common/guards/combined-auth.guard';

@Controller('skills')
@UseGuards(CombinedAuthGuard)
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  async findAll(@Headers('x-tenant-id') tenantId: string) {
    return this.skillsService.findAll(tenantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.skillsService.findOne(id);
  }

  @Post()
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() data: { name: string; description: string; prompt: string },
  ) {
    return this.skillsService.create({ ...data, tenantId });
  }

  @Patch(':id/prompt')
  async updatePrompt(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body('prompt') prompt: string,
  ) {
    return this.skillsService.updatePrompt(id, prompt, tenantId);
  }

  @Get(':id/versions')
  async getVersions(@Param('id') id: string) {
    return this.skillsService.findVersions(id);
  }

  @Post(':id/rollback/:versionId')
  async rollback(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.skillsService.rollback(id, versionId);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.skillsService.updateStatus(id, status);
  }
}
