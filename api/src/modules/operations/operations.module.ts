import { Module } from '@nestjs/common';
import { WorkersController } from './workers/workers.controller';
import { WorkersService } from './workers/workers.service';
import { JobsController } from './jobs/jobs.controller';
import { JobsService } from './jobs/jobs.service';
import { ScriptsController } from './scripts/scripts.controller';
import { ScriptsService } from './scripts/scripts.service';
import { ExecutionsController } from './executions/executions.controller';
import { ExecutionEngine } from './executions/execution.engine';
import { SchedulerService } from './scheduler/scheduler.service';
import { OperationsGateway } from './gateways/operations.gateway';
import { ApprovalEngine } from './approvals/approval.engine';

@Module({
  controllers: [
    WorkersController,
    JobsController,
    ScriptsController,
    ExecutionsController,
  ],
  providers: [
    WorkersService,
    JobsService,
    ScriptsService,
    ExecutionEngine,
    SchedulerService,
    OperationsGateway,
    ApprovalEngine,
  ],
  exports: [WorkersService, JobsService, ScriptsService, ExecutionEngine],
})
export class OperationsModule {}
