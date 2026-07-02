import { Controller, Get, Param, Patch, Body, Headers } from '@nestjs/common';
import { InboxService } from './inbox.service';
import { getTenantId } from '../../../common/tenant/tenant.middleware';

@Controller('agent-inbox')
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  @Get('conversations')
  async getConversations(@Headers('x-tenant-id') tenantIdHeader: string) {
    const tenantId = tenantIdHeader || getTenantId();
    return this.inboxService.getConversations(tenantId);
  }

  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantIdHeader: string,
  ) {
    const tenantId = tenantIdHeader || getTenantId();
    return this.inboxService.getMessages(tenantId, id);
  }

  @Patch('conversations/:id/assign')
  async assignConversation(
    @Param('id') id: string,
    @Body() body: { agentId: string; humanUserId?: string },
    @Headers('x-tenant-id') tenantIdHeader: string,
  ) {
    const tenantId = tenantIdHeader || getTenantId();
    return this.inboxService.assignConversation(
      tenantId,
      id,
      body.agentId,
      body.humanUserId,
    );
  }
}
