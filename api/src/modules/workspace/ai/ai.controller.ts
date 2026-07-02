import { Controller, Post, Body, Request } from '@nestjs/common';
import { AIService } from './ai.service';
import { getTenantId } from '../../../common/tenant/tenant.middleware';

@Controller('workspace/ai')
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Post('ask')
  ask(@Request() req: any, @Body('question') question: string) {
    const tenantId = getTenantId();
    const userId = req.user.id;
    return this.aiService.ask(tenantId, userId, question);
  }
}
