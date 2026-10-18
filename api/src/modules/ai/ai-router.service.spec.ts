import { Test, TestingModule } from '@nestjs/testing';
import { AiRouterService, RouterDecision } from './ai-router.service';
import { AiService } from './ai.service';
import { DatabaseService } from '../../common/database/database.service';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';
import { AgentsService } from '../agents/agents.service';

jest.mock('../../common/tenant/tenant.middleware', () => ({
  getTenantId: jest.fn(() => 'tenant-default'),
}));

describe('AiRouterService', () => {
  let service: AiRouterService;
  let aiService: any;
  let dbService: any;
  let kbService: any;
  let agentsService: any;

  beforeEach(async () => {
    aiService = {
      generateResponse: jest.fn().mockResolvedValue({
        content: 'Respuesta generada por IA',
        confidence: 0.95,
        isFlagged: false,
      }),
      generateRaw: jest
        .fn()
        .mockResolvedValue(JSON.stringify({ complexity: 'low' })),
    };

    dbService = {
      mysql: {
        messageOld: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        humanCorrection: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        knowledgeBaseChunk: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        knowledgeBase: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        capsule: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      },
    };

    kbService = {
      search: jest.fn().mockResolvedValue([]),
    };

    agentsService = {
      findBySlug: jest.fn().mockResolvedValue({
        name: 'Aura',
        prompt: 'Eres Aura, asistente de Cared',
        defaultModel: 'gemini-2.5-flash',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiRouterService,
        { provide: AiService, useValue: aiService },
        { provide: DatabaseService, useValue: dbService },
        { provide: KnowledgeBaseService, useValue: kbService },
        { provide: AgentsService, useValue: agentsService },
      ],
    }).compile();

    service = module.get<AiRouterService>(AiRouterService);
    service.clearActiveKbCache();
  });

  describe('1. Historial filtrado por conversación', () => {
    it('debería filtrar el historial por tenantId y conversationId cuando se proporciona conversationId', async () => {
      const tenantId = 'tenant-cared';
      const conversationId = 'conv-user-123';

      await service.route(
        'Hola Aura',
        tenantId,
        undefined,
        undefined,
        'whatsapp',
        undefined,
        conversationId,
      );

      expect(dbService.mysql.messageOld.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          conversationId,
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      });
    });

    it('debería consultar solo por tenantId si conversationId no es provisto (retrocompatibilidad)', async () => {
      const tenantId = 'tenant-cared';

      await service.route('Hola Aura', tenantId);

      expect(dbService.mysql.messageOld.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      });
    });
  });

  describe('2. Sin duplicar el mensaje actual', () => {
    it('debería excluir excludeMessageId en la cláusula where al consultar el historial', async () => {
      const tenantId = 'tenant-cared';
      const conversationId = 'conv-user-123';
      const excludeMessageId = 'msg-current-saved-id';

      await service.route(
        '¿Cuál es mi saldo?',
        tenantId,
        undefined,
        undefined,
        'whatsapp',
        undefined,
        conversationId,
        excludeMessageId,
      );

      expect(dbService.mysql.messageOld.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          conversationId,
          id: { not: excludeMessageId },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      });
    });

    it('debería filtrar excludeMessageId en memoria si viniera en el resultado y no pasarlo a generateResponse', async () => {
      const tenantId = 'tenant-cared';
      const conversationId = 'conv-user-123';
      const excludeMessageId = 'msg-current-saved-id';

      // Simular que findMany devolvió el mensaje recién guardado junto con uno previo
      dbService.mysql.messageOld.findMany.mockResolvedValue([
        { id: excludeMessageId, role: 'user', content: '¿Cuál es mi saldo?' },
        {
          id: 'msg-prev-id',
          role: 'assistant',
          content: '¡Hola! ¿En qué puedo ayudarte?',
        },
      ]);

      await service.route(
        '¿Cuál es mi saldo?',
        tenantId,
        undefined,
        undefined,
        'whatsapp',
        undefined,
        conversationId,
        excludeMessageId,
      );

      expect(aiService.generateResponse).toHaveBeenCalledWith(
        '¿Cuál es mi saldo?',
        [
          {
            id: 'msg-prev-id',
            role: 'assistant',
            content: '¡Hola! ¿En qué puedo ayudarte?',
          },
        ],
        undefined,
        undefined,
        'whatsapp',
        tenantId,
        undefined,
      );
    });
  });

  describe('3. Omisión de RAG sin KB activa y caché de 60s', () => {
    it('debería omitir kb.search cuando channel es internal y no hay base de conocimiento con status ACTIVE', async () => {
      const tenantId = 'tenant-cared';
      dbService.mysql.knowledgeBase.findFirst.mockResolvedValue(null);

      const result = await service.route(
        'Consulta sobre póliza',
        tenantId,
        undefined,
        'aura',
        'internal',
      );

      expect(result.decision).toBe(RouterDecision.RAG);
      expect(dbService.mysql.knowledgeBase.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId,
          status: 'ACTIVE',
        },
        select: { id: true },
      });
      // kb.search NO debe ejecutarse para evitar embedding innecesario
      expect(kbService.search).not.toHaveBeenCalled();
      // Prompt no debe tener prefijo de información técnica
      expect(aiService.generateResponse).toHaveBeenCalledWith(
        'Consulta sobre póliza',
        expect.any(Array),
        'gemini-2.5-flash',
        'Eres Aura, asistente de Cared',
        'internal',
        tenantId,
        'aura',
      );
    });

    it('debería ejecutar kb.search cuando existe una base de conocimiento activa', async () => {
      const tenantId = 'tenant-cared';
      dbService.mysql.knowledgeBase.findFirst.mockResolvedValue({
        id: 'kb-active-1',
        status: 'ACTIVE',
      });
      kbService.search.mockResolvedValue([
        { content: 'Información relevante de la póliza de salud.' },
      ]);

      const result = await service.route(
        'Consulta sobre póliza',
        tenantId,
        undefined,
        'aura',
        'internal',
      );

      expect(result.decision).toBe(RouterDecision.RAG);
      expect(kbService.search).toHaveBeenCalledWith(
        'Consulta sobre póliza',
        3,
        undefined,
      );
      expect(aiService.generateResponse).toHaveBeenCalledWith(
        expect.stringContaining('Información relevante de la póliza de salud.'),
        expect.any(Array),
        'gemini-2.5-flash',
        'Eres Aura, asistente de Cared',
        'internal',
        tenantId,
        'aura',
      );
    });

    it('debería cachear el chequeo de KB activa por 60s y no consultar la BD en mensajes consecutivos', async () => {
      const tenantId = 'tenant-cared';
      dbService.mysql.knowledgeBase.findFirst.mockResolvedValue(null);

      // Primer mensaje
      await service.route(
        'Primer mensaje',
        tenantId,
        undefined,
        'aura',
        'internal',
      );

      // Segundo mensaje inmediatamente después
      await service.route(
        'Segundo mensaje',
        tenantId,
        undefined,
        'aura',
        'internal',
      );

      // Tercer mensaje inmediatamente después
      await service.route(
        'Tercer mensaje',
        tenantId,
        undefined,
        'aura',
        'internal',
      );

      // findFirst solo debe haberse llamado 1 sola vez gracias a la caché
      expect(dbService.mysql.knowledgeBase.findFirst).toHaveBeenCalledTimes(1);
      expect(kbService.search).not.toHaveBeenCalled();
    });

    it('debería consultar de nuevo la base de datos si se limpia la caché', async () => {
      const tenantId = 'tenant-cared';
      dbService.mysql.knowledgeBase.findFirst.mockResolvedValue(null);

      // Primer mensaje
      await service.route(
        'Primer mensaje',
        tenantId,
        undefined,
        'aura',
        'internal',
      );
      expect(dbService.mysql.knowledgeBase.findFirst).toHaveBeenCalledTimes(1);

      // Limpiar caché
      service.clearActiveKbCache(tenantId);

      // Segundo mensaje después de limpiar caché
      await service.route(
        'Segundo mensaje',
        tenantId,
        undefined,
        'aura',
        'internal',
      );
      expect(dbService.mysql.knowledgeBase.findFirst).toHaveBeenCalledTimes(2);
    });
  });
});
