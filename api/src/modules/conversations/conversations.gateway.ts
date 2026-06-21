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

@WebSocketGateway({
  cors: {
    origin: ['https://pitayacore.pitayacode.io', 'http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  },
})
export class ConversationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('ConversationsGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinTenant')
  handleJoinTenant(@ConnectedSocket() client: Socket, @MessageBody() tenantId: string) {
    client.join(tenantId);
    this.logger.log(`Client ${client.id} joined room: ${tenantId}`);
    return { event: 'joined', data: tenantId };
  }

  @SubscribeMessage('leaveTenant')
  handleLeaveTenant(@ConnectedSocket() client: Socket, @MessageBody() tenantId: string) {
    client.leave(tenantId);
    this.logger.log(`Client ${client.id} left room: ${tenantId}`);
    return { event: 'left', data: tenantId };
  }

  @SubscribeMessage('joinConversation')
  handleJoinConversation(@ConnectedSocket() client: Socket, @MessageBody() conversationId: string) {
    client.join(conversationId);
    this.logger.log(`Client ${client.id} joined conversation room: ${conversationId}`);
    return { event: 'joined', data: conversationId };
  }

  // Método para ser llamado desde ConversationsService
  emitNewMessage(tenantId: string, message: any) {
    // Para la bandeja (todos los operadores del tenant)
    this.server.to(tenantId).emit('newMessage', message);
    // Para el cliente específico (solo en su conversación)
    this.server.to(message.conversationId).emit('newMessage', message);
  }
  
  emitConversationUpdate(tenantId: string, conversation: any) {
    this.server.to(tenantId).emit('conversationUpdate', conversation);
  }
}
