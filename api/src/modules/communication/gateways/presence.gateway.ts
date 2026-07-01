import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
@WebSocketGateway({
  namespace: '/presence',
  cors: { origin: '*' },
})
export class PresenceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PresenceGateway.name);

  // Maps to keep track of online users and agents
  private onlineUsers = new Map<string, string>(); // socketId -> userId
  
  constructor(private eventEmitter: EventEmitter2) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to /presence: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from /presence: ${client.id}`);
    const userId = this.onlineUsers.get(client.id);
    if (userId) {
      this.onlineUsers.delete(client.id);
      this.server.emit('user.offline', { userId });
      this.eventEmitter.emit('presence.user.offline', { userId });
    }
  }

  @SubscribeMessage('set.status')
  handleSetStatus(
    @MessageBody() payload: { userId: string; status: 'online' | 'offline' | 'busy' },
    @ConnectedSocket() client: Socket,
  ) {
    if (payload.status === 'online') {
      this.onlineUsers.set(client.id, payload.userId);
      this.server.emit('user.online', { userId: payload.userId, status: payload.status });
    } else if (payload.status === 'offline') {
      this.onlineUsers.delete(client.id);
      this.server.emit('user.offline', { userId: payload.userId });
    }
    return { status: 'ok' };
  }

  @SubscribeMessage('user.typing')
  handleUserTyping(
    @MessageBody() payload: { conversationId: string; userId: string; tenantId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.server.to(payload.tenantId).emit('user.typing', payload);
  }

  @SubscribeMessage('user.stop_typing')
  handleUserStopTyping(
    @MessageBody() payload: { conversationId: string; userId: string; tenantId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.server.to(payload.tenantId).emit('user.stop_typing', payload);
  }

  // --- Server to Client Methods --- //

  broadcastAgentTyping(tenantId: string, payload: { conversationId: string; agentId: string }) {
    this.server.to(tenantId).emit('agent.typing', payload);
  }

  broadcastAgentStopTyping(tenantId: string, payload: { conversationId: string; agentId: string }) {
    this.server.to(tenantId).emit('agent.stop_typing', payload);
  }
}