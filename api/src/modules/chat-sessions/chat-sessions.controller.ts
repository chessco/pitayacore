import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ChatSessionsService } from './chat-sessions.service';
import { TenantOwnershipGuard } from '../../common/guards/tenant-ownership.guard';

@Controller('tenants/:tenantId/chat-sessions')
@UseGuards(TenantOwnershipGuard)
export class ChatSessionsController {
  constructor(private readonly chatSessionsService: ChatSessionsService) {}

  @Get()
  async getSessions(@Param('tenantId') tenantId: string) {
    return this.chatSessionsService.getSessions(tenantId);
  }

  @Post()
  async createSession(
    @Param('tenantId') tenantId: string,
    @Body('title') title: string,
  ) {
    return this.chatSessionsService.createSession(
      tenantId,
      title || 'Nuevo Chat Creativo',
    );
  }

  @Get(':id/messages')
  async getSessionMessages(@Param('id') id: string) {
    return this.chatSessionsService.getSessionMessages(id);
  }

  @Post(':id/messages')
  async postMessage(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body('text') text: string,
  ) {
    return this.chatSessionsService.postMessage(id, text, tenantId);
  }

  @Post(':id/approve')
  async approveCampaign(@Param('id') id: string) {
    return this.chatSessionsService.approveCampaign(id);
  }
}
