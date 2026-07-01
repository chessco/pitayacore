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
  namespace: '/agent-inbox',
  cors: { origin: '*' },
})
export class AgentInboxGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AgentInboxGateway.name);

  constructor(private eventEmitter: EventEmitter2) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to /agent-inbox: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from /agent-inbox: ${client.id}`);
  }

  @SubscribeMessage('join.tenant')
  handleJoinTenant(
    @MessageBody() tenantId: string,
    @ConnectedSocket() client: Socket,
  ) {
    if (tenantId) {
      client.join(tenantId);
      this.logger.log(`Client ${client.id} joined room ${tenantId}`);
      return { status: 'ok', room: tenantId };
    }
    return { status: 'error', message: 'No tenantId provided' };
  }

  @SubscribeMessage('message.send')
  handleMessageSend(
    @MessageBody() payload: { conversationId: string; content: string; tenantId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.eventEmitter.emit('agent-inbox.message.send', { ...payload, socketId: client.id });
    return { status: 'processing' };
  }

  @SubscribeMessage('conversation.assign')
  handleConversationAssign(
    @MessageBody() payload: { conversationId: string; operatorId: string; tenantId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.eventEmitter.emit('agent-inbox.conversation.assign', { ...payload, socketId: client.id });
    return { status: 'processing' };
  }

  @SubscribeMessage('hitl.resolve')
  handleHitlResolve(
    @MessageBody() payload: { conversationId: string; tenantId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.eventEmitter.emit('agent-inbox.hitl.resolve', { ...payload, socketId: client.id });
    return { status: 'processing' };
  }

  // --- Server to Client Methods --- //

  broadcastNewConversation(tenantId: string, conversation: any) {
    this.server.to(tenantId).emit('conversation.new', conversation);
  }

  broadcastConversationUpdate(tenantId: string, conversation: any) {
    this.server.to(tenantId).emit('conversation.updated', conversation);
  }

  broadcastNewMessage(tenantId: string, message: any) {
    this.server.to(tenantId).emit('message.new', message);
  }

  broadcastAgentStatusChange(tenantId: string, statusEvent: any) {
    this.server.to(tenantId).emit('agent.status.changed', statusEvent);
  }

  broadcastHitlRequest(tenantId: string, request: any) {
    this.server.to(tenantId).emit('hitl.request.new', request);
  }
}