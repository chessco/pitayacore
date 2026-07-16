import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { WorkersService } from '../workers/workers.service';
import { JobsService } from '../jobs/jobs.service';
import { ExecutionEngine } from '../executions/execution.engine';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/operations' })
export class OperationsGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OperationsGateway.name);

  constructor(
    private readonly workersService: WorkersService,
    private readonly jobsService: JobsService,
    @Inject(forwardRef(() => ExecutionEngine))
    private readonly executionEngine: ExecutionEngine,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    const tenantId = client.handshake.headers['x-tenant-id'] as string;
    if (tenantId) {
      const activeJobs = await this.jobsService.findActiveCronJobs(tenantId);
      if (activeJobs.length > 0) {
        this.logger.log(`Auto-starting ${activeJobs.length} active cron jobs for tenant ${tenantId}`);
        for (const job of activeJobs) {
          client.emit('job.execute', {
            jobId: job.id,
            executionId: `auto-${Date.now()}`,
            executionPlan: job.executionPlan,
            cronExpression: job.cronExpression,
          });
        }
      }
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('worker_heartbeat')
  async handleHeartbeat(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    if (data.workerId) {
      await this.workersService.heartbeat(
        data.workerId,
        data.status,
        data.health,
      );
      this.server.emit('worker_updated', { workerId: data.workerId });
    }
  }

  @SubscribeMessage('job.cron_tick')
  async handleCronTick(
    @MessageBody() data: any,
  ) {
    if (data.jobId) {
      await this.jobsService.updateLastRun(data.jobId);
      this.server.emit('job_updated', { jobId: data.jobId });
    }
  }

  @SubscribeMessage('job.execution_completed')
  async handleExecutionCompleted(@MessageBody() data: any) {
    if (data.executionId && data.workerId) {
      await this.executionEngine.completeExecution(data.executionId, data.workerId);
      this.server.emit('job_updated', { executionId: data.executionId });
    }
  }

  @SubscribeMessage('job.execution_failed')
  async handleExecutionFailed(@MessageBody() data: any) {
    if (data.executionId && data.workerId) {
      await this.executionEngine.failExecution(data.executionId, data.workerId, data.error);
      this.server.emit('job_updated', { executionId: data.executionId });
    }
  }
}
