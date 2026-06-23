import { Controller, Get } from '@nestjs/common';
import { AgentTemplatesService } from './agent-templates.service';

@Controller('api/agent-templates')
export class AgentTemplatesController {
  constructor(private readonly agenttemplatesService: AgentTemplatesService) {}

  @Get()
  findAll() {
    return this.agenttemplatesService.findAll();
  }
}
