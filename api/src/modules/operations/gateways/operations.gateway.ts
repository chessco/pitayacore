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

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/operations' })
export class OperationsGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OperationsGateway.name);

  constructor(private readonly workersService: WorkersService) {}

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
}
