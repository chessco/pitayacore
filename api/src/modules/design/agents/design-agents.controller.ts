import { Controller, Post, Body, Get } from '@nestjs/common';
import { DesignArchitectService } from './design-architect.service';
import { getTenantId } from '../../../common/tenant/tenant.middleware';

@Controller('design/agents')
export class DesignAgentsController {
  constructor(private readonly designArchitect: DesignArchitectService) {}

  /**
   * POST /design/agents/design-architect/run
   * Runs the Design Architect agent with any supported task.
   */
  @Post('design-architect/run')
  async run(
    @Body()
    body: {
      task:
        | 'generate-brand-identity'
        | 'analyze-brand'
        | 'recommend-theme'
        | 'validate-accessibility'
        | 'query';
      brandId?: string;
      payload?: any;
    },
  ) {
    const tenantId = getTenantId();

    // Ensure the agent is registered in the agent table
    await this.designArchitect.ensureAgentRegistered(tenantId);

    return this.designArchitect.run({
      tenantId,
      task: body.task,
      brandId: body.brandId,
      payload: body.payload,
    });
  }
}
