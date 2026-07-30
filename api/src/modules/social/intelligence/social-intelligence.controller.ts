import { Controller, Get } from '@nestjs/common';
import { SocialIntelligenceService } from './social-intelligence.service';
import { Public } from '../../../common/guards/public.decorator';

/**
 * Root SIS controller. All SIS routes live under the reserved
 * `/social-intelligence` prefix so they never collide with the existing
 * `social` (`/api/social/...`) or `social-posts` (`/tenants/:id/social-posts`)
 * modules.
 */
@Controller('social-intelligence')
export class SocialIntelligenceController {
  constructor(private readonly service: SocialIntelligenceService) {}

  /** Liveness probe for the SIS module. Public so it can be used unauthenticated. */
  @Public()
  @Get('health')
  health() {
    return this.service.health();
  }
}
