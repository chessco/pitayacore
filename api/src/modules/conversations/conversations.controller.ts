import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  Post,
  Headers,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { getTenantId } from '../../common/tenant/tenant.middleware';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  async getConversations() {
    return this.conversationsService.getConversations();
  }

  @Get('by-phone/:phone')
  async getByPhone(@Param('phone') phone: string) {
    return this.conversationsService.findConversationByPhone(phone);
  }

  @Get('operators')
  async getOperators() {
    return this.conversationsService.getOperators();
  }

  @Get(':id/messages')
  async getMessages(@Param('id') id: string) {
    return this.conversationsService.getMessages(id);
  }

  @Patch(':id/assign')
  async assign(
    @Param('id') id: string,
    @Body() body: { operatorId: string; userId?: string },
  ) {
    return this.conversationsService.assignToOperator(
      id,
      body.operatorId,
      body.userId,
    );
  }

  @Post(':id/reply')
  async reply(@Param('id') id: string, @Body() body: { content: string }) {
    return this.conversationsService.saveOperatorMessage(id, body.content);
  }

  @Post(':id/request-agent')
  async requestAgent(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    const tid = tenantId || getTenantId();
    return this.conversationsService.autoAssignOperator(id, tid);
  }

  @Post(':id/typing')
  async setTyping(@Param('id') id: string) {
    return this.conversationsService.setHumanActive(id);
  }

  @Patch(':id/autopilot')
  async setAutopilot(@Param('id') id: string) {
    return this.conversationsService.setAutopilotActive(id);
  }
}
