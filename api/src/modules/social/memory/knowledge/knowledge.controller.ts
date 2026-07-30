import { Controller, Param, Post } from '@nestjs/common';
import { getTenantId } from '../../../../common/tenant/tenant.middleware';
import { KnowledgeAdapterService } from './knowledge-adapter.service';

/** Manual Knowledge Suite ingestion for analyzed social content. */
@Controller('social-intelligence/knowledge')
export class KnowledgeController {
  constructor(private readonly adapter: KnowledgeAdapterService) {}

  /** Push one analyzed content item into the Knowledge Suite. */
  @Post('ingest/:contentItemId')
  ingest(@Param('contentItemId') contentItemId: string) {
    return this.adapter.ingestItem(getTenantId(), contentItemId);
  }
}
