import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { VectorSearchService } from './vector-search.service';
import { TenantOwnershipGuard } from '../../common/guards/tenant-ownership.guard';

@Controller('tenants/:tenantId')
@UseGuards(TenantOwnershipGuard)
export class VectorSearchController {
  constructor(private readonly vectorSearchService: VectorSearchService) {}

  @Post('search')
  @HttpCode(200)
  async search(
    @Param('tenantId') tenantId: string,
    @Body() body: { query: string; limit?: number },
  ) {
    return this.vectorSearchService.search(tenantId, body.query, body.limit);
  }

  @Post('assets/:assetId/index')
  @HttpCode(200)
  async indexAsset(
    @Param('tenantId') tenantId: string,
    @Param('assetId') assetId: string,
    @Body() body: { description: string },
  ) {
    await this.vectorSearchService.indexAsset(
      tenantId,
      assetId,
      body.description,
    );
    return { indexed: true };
  }
}
