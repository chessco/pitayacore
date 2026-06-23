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

@Controller('api/chat-sessions')
export class ChatSessionsController {
  constructor(private readonly chatSessionsService: ChatSessionsService) {}

  @Get()
  async getSessions(@Req() req: any) {
    // Para simplificar, obtenemos tenantId de los headers o request temporal
    // En producción usaríamos un decorador de Auth/Tenant
    const tenantId = req.headers['x-tenant-id'] || 'vision-tenant';
    return this.chatSessionsService.getSessions(tenantId);
  }

  @Post()
  async createSession(@Req() req: any, @Body('title') title: string) {
    const tenantId = req.headers['x-tenant-id'] || 'vision-tenant';
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
  async postMessage(@Param('id') id: string, @Body('text') text: string) {
    return this.chatSessionsService.postMessage(id, text);
  }

  @Post(':id/approve')
  async approveCampaign(@Param('id') id: string) {
    return this.chatSessionsService.approveCampaign(id);
  }
}
