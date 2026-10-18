import { Test, TestingModule } from '@nestjs/testing';
import { BadGatewayException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConversationsService } from './conversations.service';
import { DatabaseService } from '../../common/database/database.service';
import { AiRouterService } from '../ai/ai-router.service';
import { ConversationsGateway } from './conversations.gateway';

describe('ConversationsService - Error Handling & No Echo', () => {
  let service: ConversationsService;
  let dbService: any;
  let aiRouter: any;
  let gateway: any;

  beforeEach(async () => {
    dbService = {
      mysql: {
        conversationOld: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ id: 'conv-1', metadata: {} }),
          create: jest.fn().mockResolvedValue({ id: 'conv-1', metadata: {} }),
        },
        messageOld: {
          create: jest
            .fn()
            .mockImplementation(({ data }) =>
              Promise.resolve({ id: 'msg-user-1', ...data }),
            ),
        },
        tenant: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'tenant-1',
            name: 'Tenant Test',
          }),
        },
        contact: {
          findFirst: jest.fn().mockResolvedValue({ id: 'contact-1' }),
          create: jest.fn().mockResolvedValue({ id: 'contact-1' }),
        },
        lead: {
          upsert: jest.fn().mockResolvedValue({ id: 'lead-1' }),
        },
        activity: {
          create: jest.fn().mockResolvedValue({ id: 'activity-1' }),
        },
      },
    };

    aiRouter = {
      route: jest.fn(),
    };

    gateway = {
      emitNewMessage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        { provide: DatabaseService, useValue: dbService },
        { provide: AiRouterService, useValue: aiRouter },
        { provide: HttpService, useValue: {} },
        { provide: ConversationsGateway, useValue: gateway },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
  });

  it('debería lanzar BadGatewayException y NO devolver el mensaje del usuario si aiRouter.route falla y throwOnAiFailure está activado (agents.controller)', async () => {
    aiRouter.route.mockRejectedValue(new Error('LLM Gateway 503 Unavailable'));

    await expect(
      service.handleIncomingMessage(
        'user@cared.com',
        '¿Cómo va la orden REP-54?',
        'tenant-1',
        'ext-1',
        undefined,
        'aura',
        'internal',
        { internalChat: true, throwOnAiFailure: true },
      ),
    ).rejects.toThrow(BadGatewayException);

    // Verifica que el mensaje del usuario sí se persistió
    expect(dbService.mysql.messageOld.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'user',
          content: '¿Cómo va la orden REP-54?',
        }),
      }),
    );

    // Verifica que NO se guardó un mensaje de asistente con el contenido del usuario
    expect(dbService.mysql.messageOld.create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'assistant',
        }),
      }),
    );
  });

  it('debería retornar el mensaje guardado sin lanzar 5xx ni duplicar mensajes cuando aiRouter.route falla en llamadas de webhooks/otros', async () => {
    aiRouter.route.mockRejectedValue(new Error('LLM Gateway 503 Unavailable'));

    // Llamada típica de webhooks.controller sin throwOnAiFailure
    const result = await service.handleIncomingMessage(
      'whatsapp:+1234567890',
      'Hola, información de productos',
      'tenant-1',
      'ext-whatsapp-1',
      undefined,
      'aura',
      'whatsapp',
      // sin metadata o con metadata sin throwOnAiFailure
    );

    // No debe lanzar 5xx y debe devolver el mensaje del usuario guardado
    expect(result).toBeDefined();
    expect(result.role).toBe('user');
    expect(result.content).toBe('Hola, información de productos');

    // Debe haberse creado el mensaje de usuario exactamente una vez
    expect(dbService.mysql.messageOld.create).toHaveBeenCalledTimes(1);
    expect(dbService.mysql.messageOld.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'user',
          content: 'Hola, información de productos',
        }),
      }),
    );

    // NO debe haber creado mensaje de asistente adicional (no duplicación)
    expect(dbService.mysql.messageOld.create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'assistant',
        }),
      }),
    );
  });
});
