import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { COMMUNICATION_EVENTS, SessionStatusEvent, MessageReceivedEvent } from '../events/communication.events';

@WebSocketGateway({
  cors: {
    origin: [
      'https://pitayacore.pitayacode.io',
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    credentials: true,
  },
  namespace: 'communication', // Using a dedicated namespace
})
export class CommunicationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger(CommunicationGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to communication namespace: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from communication namespace: ${client.id}`);
  }

  @SubscribeMessage('joinTenant')
  handleJoinTenant(
    @ConnectedSocket() client: Socket,
    @MessageBody() tenantId: string,
  ) {
    if (tenantId) {
      client.join(tenantId);
      this.logger.debug(`Client ${client.id} joined tenant room: ${tenantId}`);
    }
  }

  @SubscribeMessage('leaveTenant')
  handleLeaveTenant(
    @ConnectedSocket() client: Socket,
    @MessageBody() tenantId: string,
  ) {
    if (tenantId) {
      client.leave(tenantId);
      this.logger.debug(`Client ${client.id} left tenant room: ${tenantId}`);
    }
  }

  // Listen to the internal event bus and broadcast to websocket clients in the tenant room
  @OnEvent(COMMUNICATION_EVENTS.SESSION_STATUS_CHANGED)
  handleSessionStatusChanged(event: SessionStatusEvent) {
    this.logger.debug(`Broadcasting status change for tenant ${event.tenantId}: ${event.status}`);
    this.server.to(event.tenantId).emit('session.status', event);
  }

  @OnEvent(COMMUNICATION_EVENTS.QR_CODE_GENERATED)
  handleQrCodeGenerated(event: SessionStatusEvent) {
    this.logger.debug(`Broadcasting QR code for tenant ${event.tenantId}, channel ${event.channelId}`);
    this.server.to(event.tenantId).emit('session.qr', { qr: event.data.qr, channelId: event.channelId });
  }

  @OnEvent(COMMUNICATION_EVENTS.MESSAGE_RECEIVED)
  handleMessageReceived(event: MessageReceivedEvent) {
    this.logger.debug(`Broadcasting new message for tenant ${event.tenantId}, channel ${event.channelId}`);
    this.server.to(event.tenantId).emit('message.new', {
      from: event.from,
      content: event.content,
      provider: event.provider,
      channelId: event.channelId,
    });
  }

  // --- New Channel Connected Events ---
  @OnEvent('channel.connected')
  handleChannelConnected(event: { tenantId: string; provider: string; channelId: string }) {
    this.server.to(event.tenantId).emit('new_channel_connected', event);
  }

  @OnEvent('channel.disconnected')
  handleChannelDisconnected(event: { tenantId: string; provider: string; channelId: string }) {
    this.server.to(event.tenantId).emit('channel_disconnected', event);
  }

  @OnEvent('channel.sync_completed')
  handleSyncCompleted(event: { tenantId: string; provider: string }) {
    this.server.to(event.tenantId).emit('omnichannel_sync_completed', event);
  }
}