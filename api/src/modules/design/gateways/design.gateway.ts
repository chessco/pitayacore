import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

export interface DesignEvent {
  event: string;
  tenantId: string;
  payload: any;
}

@WebSocketGateway({
  namespace: '/design',
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
export class DesignGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DesignGateway.name);

  afterInit() {
    this.logger.log('DesignGateway initialized — namespace: /design');
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Design client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Design client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-tenant')
  handleJoinTenant(client: Socket, tenantId: string) {
    client.join(`tenant:${tenantId}`);
    this.logger.debug(
      `Client ${client.id} joined design room: tenant:${tenantId}`,
    );
    return { event: 'joined', tenantId };
  }

  // ── Emit helpers ────────────────────────────────────────────────

  emitThemeActivated(tenantId: string, themeId: string, version: string) {
    this.server.to(`tenant:${tenantId}`).emit('theme.activated', {
      themeId,
      tenantId,
      version,
      timestamp: new Date().toISOString(),
    });
  }

  emitThemeUpdated(tenantId: string, themeId: string) {
    this.server.to(`tenant:${tenantId}`).emit('theme.updated', {
      themeId,
      tenantId,
      timestamp: new Date().toISOString(),
    });
  }

  emitThemeVersionCreated(tenantId: string, themeId: string, version: string) {
    this.server.to(`tenant:${tenantId}`).emit('theme.version.created', {
      themeId,
      version,
      tenantId,
      timestamp: new Date().toISOString(),
    });
  }

  emitThemeRolledBack(tenantId: string, themeId: string, version: string) {
    this.server.to(`tenant:${tenantId}`).emit('theme.rolledback', {
      themeId,
      version,
      tenantId,
      timestamp: new Date().toISOString(),
    });
  }

  emitBrandUpdated(tenantId: string, brandId: string) {
    this.server.to(`tenant:${tenantId}`).emit('brand.updated', {
      brandId,
      tenantId,
      timestamp: new Date().toISOString(),
    });
  }

  emitSyncCompleted(tenantId: string, version: string, checksum: string) {
    this.server.to(`tenant:${tenantId}`).emit('sync.completed', {
      tenantId,
      version,
      checksum,
      timestamp: new Date().toISOString(),
    });
  }

  emitWorkflowCompleted(tenantId: string, workflowName: string, result: any) {
    this.server.to(`tenant:${tenantId}`).emit('workflow.completed', {
      workflowName,
      tenantId,
      result,
      timestamp: new Date().toISOString(),
    });
  }
}
