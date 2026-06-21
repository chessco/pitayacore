import { Controller, Post, Body, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { ConversationsService } from '../conversations/conversations.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private conversationsService: ConversationsService) {}

  @Post('flow/incoming')
  async handleFlowIncoming(
    @Headers('x-internal-key') internalKey: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() payload: { userId: string, content: string, externalId?: string, skills?: any, agentSlug?: string, channel?: string }
  ) {
    const channel = payload.channel || 'whatsapp';
    const validKey = process.env.INTERNAL_API_KEY;
    if (!validKey || internalKey !== validKey) {
      this.logger.error(`Unauthorized access attempt with key: ${internalKey?.substring(0, 5)}...`);
      throw new UnauthorizedException('Invalid internal key');
    }

    // tenantId is handled by middleware, so we don't need to pass it explicitly to service
    // but we can log it
    console.log(`[Pitayacore Webhook] Received message for tenant ${tenantId} from ${payload.userId}. Content: ${payload.content}`);
    console.log(`[Pitayacore Webhook] Skills active:`, payload.skills);
    
    return this.conversationsService.handleIncomingMessage(
      payload.userId,
      payload.content,
      tenantId,
      payload.externalId,
      payload.skills,
      payload.agentSlug,
      channel
    );
  }
}
