import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { getTenantId } from '../../../common/tenant/tenant.middleware';

@Controller('workspace/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@Query('q') query: string) {
    const tenantId = getTenantId();
    return this.searchService.search(tenantId, query);
  }
}
