import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { WorkersService } from '../workers/workers.service';
import { JobsService } from '../jobs/jobs.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/operations' })
export class OperationsGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OperationsGateway.name);

  constructor(
    private readonly workersService: WorkersService,
    private readonly jobsService: JobsService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
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
}
