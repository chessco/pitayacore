import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../../../common/guards/api-key.guard';
import { CollectorService } from './collector.service';

/**
 * Controller to trigger social data collection.
 * Intended to be called by the Operations Suite (Runtime Worker) securely.
 */
@Controller('social/collection')
@UseGuards(ApiKeyGuard)
export class CollectorController {
  constructor(private readonly collectorService: CollectorService) {}

  /**
   * Triggers the collection for all active social connectors.
   * This endpoint is protected by ApiKeyGuard so only internal agents/services
   * with the correct x-api-key can trigger it.
   */
  @Post('trigger')
  async triggerCollection() {
    // Run asynchronously to avoid blocking the HTTP response for too long
    // The collection process handles its own logging and error containment
    this.collectorService.pollActiveConnectors().catch((err) => {
      console.error('Triggered collection failed:', err);
    });

    return { status: 'triggered', message: 'Collection process started' };
  }
}
