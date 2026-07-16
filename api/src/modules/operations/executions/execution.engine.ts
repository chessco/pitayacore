import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { DatabaseService } from 'src/common/database/database.service';
import { getTenantId } from '../../../common/tenant/tenant.middleware';
import { OperationsGateway } from '../gateways/operations.gateway';

@Injectable()
export class ExecutionEngine {
  private readonly logger = new Logger(ExecutionEngine.name);

  constructor(
    private readonly db: DatabaseService,
    @Inject(forwardRef(() => OperationsGateway))
    private readonly gateway: OperationsGateway,
  ) {}

  async findAll() {
    const tenantId = getTenantId();
    return this.db.mysql.jobExecution.findMany({ where: { tenantId } });
  }

  async executeJob(jobId: string) {
    const tenantId = getTenantId();
    const job = await this.db.mysql.job.findUnique({
      where: { id: jobId, tenantId },
    });
    if (!job) throw new Error('Job not found');

    const execution = await this.db.mysql.jobExecution.create({
      data: {
        tenantId,
        jobId: job.id,
        status: 'PENDING',
        startAt: new Date(),
      },
    });

    this.logger.log(`Execution ${execution.id} created for Job ${job.name}`);

    // Emit event to worker via websocket
    this.gateway.server.emit('job.execute', {
      jobId: job.id,
      executionId: execution.id,
      executionPlan: job.executionPlan,
      cronExpression: job.cronExpression,
    });

    return execution;
  }
}
