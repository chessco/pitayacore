import { Test, TestingModule } from '@nestjs/testing';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { ConversationsService } from '../conversations/conversations.service';

// Mock getTenantId middleware helper
jest.mock('../../common/tenant/tenant.middleware', () => ({
  getTenantId: jest.fn(() => 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718'),
}));

import { getTenantId } from '../../common/tenant/tenant.middleware';

describe('AgentsController', () => {
  let controller: AgentsController;
  let agentsService: any;
  let conversationsService: any;

  beforeEach(async () => {
    const agentsServiceMock = {
      findAll: jest.fn(),
      create: jest.fn(),
      findBySlug: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      findVersions: jest.fn(),
      rollback: jest.fn(),
    };

    const conversationsServiceMock = {
      handleIncomingMessage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgentsController],
      providers: [
        { provide: AgentsService, useValue: agentsServiceMock },
        { provide: ConversationsService, useValue: conversationsServiceMock },
      ],
    }).compile();

    controller = module.get<AgentsController>(AgentsController);
    agentsService = module.get<AgentsService>(AgentsService);
    conversationsService =
      module.get<ConversationsService>(ConversationsService);
  });

  describe('findAll', () => {
    it('debería resolver el tenantId y llamar a agentsService.findAll', async () => {
      const mockAgents = [{ id: '1', name: 'Agent 1' }];
      agentsService.findAll.mockResolvedValue(mockAgents);

      const result = await controller.findAll();
      expect(result).toEqual(mockAgents);
      expect(getTenantId).toHaveBeenCalled();
      expect(agentsService.findAll).toHaveBeenCalledWith(
        'edd1ac37-5ff9-4e46-bc7f-fff3c414d718',
      );
    });
  });

  describe('create', () => {
    it('debería llamar a agentsService.create con los datos y el tenantId', async () => {
      const inputData = {
        name: 'Agent New',
        slug: 'agent-new',
        prompt: 'prompt test',
      };
      const expectedResult = {
        id: '2',
        ...inputData,
        tenantId: 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718',
      };
      agentsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(inputData);
      expect(result).toEqual(expectedResult);
      expect(agentsService.create).toHaveBeenCalledWith({
        ...inputData,
        tenantId: 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718',
      });
    });
  });

  describe('findOne', () => {
    it('debería retornar un agente por su slug y tenantId', async () => {
      const mockAgent = { id: '1', slug: 'agent-1' };
      agentsService.findBySlug.mockResolvedValue(mockAgent);

      const result = await controller.findOne('agent-1');
      expect(result).toEqual(mockAgent);
      expect(agentsService.findBySlug).toHaveBeenCalledWith(
        'agent-1',
        'edd1ac37-5ff9-4e46-bc7f-fff3c414d718',
      );
    });
  });

  describe('chat', () => {
    it('debería delegar el chat a ConversationsService y formatear el resultado', async () => {
      const mockAiResponse = {
        content: 'Respuesta de IA',
        conversationId: 'conv-abc',
      };
      conversationsService.handleIncomingMessage.mockResolvedValue(
        mockAiResponse,
      );

      const result = await controller.chat(
        'agent-1',
        { message: 'Hola' },
        'tenant-override',
        'operator@email.com',
      );

      expect(result).toEqual({
        content: 'Respuesta de IA',
        role: 'assistant',
        conversationId: 'conv-abc',
      });
      expect(conversationsService.handleIncomingMessage).toHaveBeenCalledWith(
        'operator@email.com',
        'Hola',
        'tenant-override',
        'operator@email.com',
        undefined,
        'agent-1',
        'internal',
        { internalChat: true, operatorEmail: 'operator@email.com' },
      );
    });

    it('debería usar fallbacks si tenant-id y operator-email no son provistos', async () => {
      conversationsService.handleIncomingMessage.mockResolvedValue({
        content: 'Respuesta',
        conversationId: 'conv-123',
      });

      await controller.chat('agent-1', { message: 'Hola' });
      expect(conversationsService.handleIncomingMessage).toHaveBeenCalledWith(
        'internal-user',
        'Hola',
        'edd1ac37-5ff9-4e46-bc7f-fff3c414d718',
        'internal-user',
        undefined,
        'agent-1',
        'internal',
        { internalChat: true, operatorEmail: undefined },
      );
    });
  });

  describe('update', () => {
    it('debería llamar a agentsService.update', async () => {
      const updateData = { name: 'New Name' };
      agentsService.update.mockResolvedValue({ id: '1', ...updateData });

      const result = await controller.update('1', updateData);
      expect(result).toEqual({ id: '1', ...updateData });
      expect(agentsService.update).toHaveBeenCalledWith('1', updateData);
    });
  });

  describe('deploy', () => {
    it('debería llamar a updateStatus con PRODUCTION', async () => {
      agentsService.updateStatus.mockResolvedValue({
        id: '1',
        status: 'PRODUCTION',
      });

      const result = await controller.deploy('1');
      expect(result).toEqual({ id: '1', status: 'PRODUCTION' });
      expect(agentsService.updateStatus).toHaveBeenCalledWith(
        '1',
        'PRODUCTION',
      );
    });
  });

  describe('getVersions', () => {
    it('debería llamar a agentsService.findVersions', async () => {
      const mockVersions = [{ id: 'v1' }];
      agentsService.findVersions.mockResolvedValue(mockVersions);

      const result = await controller.getVersions('1');
      expect(result).toEqual(mockVersions);
      expect(agentsService.findVersions).toHaveBeenCalledWith('1');
    });
  });

  describe('rollback', () => {
    it('debería llamar a agentsService.rollback', async () => {
      agentsService.rollback.mockResolvedValue({ id: '1', version: '2.0' });

      const result = await controller.rollback('1', 'v2');
      expect(result).toEqual({ id: '1', version: '2.0' });
      expect(agentsService.rollback).toHaveBeenCalledWith('1', 'v2');
    });
  });
});
