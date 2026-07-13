import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { SocialAgentsService } from './social-agents.service';
import { getTenantId } from '../../../common/tenant/tenant.middleware';
import { CombinedAuthGuard } from '../../../common/guards/combined-auth.guard';
import { FeatureFlagGuard } from '../../../common/guards/feature-flag.guard';
import { RequireFeature } from '../../../common/decorators/require-feature.decorator';

@Controller('api/social/agents')
@UseGuards(CombinedAuthGuard, FeatureFlagGuard)
@RequireFeature('SOCIAL_SUITE')
export class SocialAgentsController {
  constructor(private readonly agentsService: SocialAgentsService) {}

  @Get('templates')
  listTemplates() {
    return this.agentsService.listTemplates();
  }

  @Post('chat')
  chat(@Body() body: { agentSlug: string; message: string; context?: any }) {
    return this.agentsService.chat(
      getTenantId(),
      body.agentSlug,
      body.message,
      body.context,
    );
  }
}
