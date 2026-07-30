import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { getTenantId } from '../../../../common/tenant/tenant.middleware';
import { ContentService } from './content.service';
import { PipelineService } from '../../intelligence/ai/pipeline.service';

/** Read + re-analyze endpoints for collected social content. */
@Controller('social-intelligence/content')
export class ContentController {
  constructor(
    private readonly content: ContentService,
    private readonly pipeline: PipelineService,
  ) {}

  @Get()
  list(
    @Query('source') source?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.content.list(getTenantId(), {
      source,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.content.get(getTenantId(), id);
  }

  /** Manually (re)run the AI pipeline for a single item. */
  @Post(':id/analyze')
  async analyze(@Param('id') id: string) {
    const tenantId = getTenantId();
    await this.pipeline.analyzeItem(tenantId, id);
    return this.content.get(tenantId, id);
  }
}
