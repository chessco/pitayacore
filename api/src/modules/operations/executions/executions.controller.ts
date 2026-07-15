import { Controller, Get, Post, Param } from '@nestjs/common';
import { ExecutionEngine } from './execution.engine';

@Controller('operations/executions')
export class ExecutionsController {
  constructor(private readonly executionEngine: ExecutionEngine) {}

  @Get()
  async getExecutions() {
    return this.executionEngine.findAll();
  }

  @Post(':jobId/execute')
  async executeJob(@Param('jobId') jobId: string) {
    return this.executionEngine.executeJob(jobId);
  }
}
