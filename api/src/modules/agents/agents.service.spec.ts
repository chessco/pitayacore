import { Test, TestingModule } from '@nestjs/testing';
import { AgentsService } from './agents.service';
import { DatabaseService } from '../../common/database/database.service';

describe('AgentsService', () => {
  let service: AgentsService;
  let db: any;

  beforeEach(async () => {
    const dbMock = {
      mysql: {
        agent: {
          findFirst: jest.fn(),
          findUnique: jest.fn(),
          findMany: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
        agentVersion: {
          create: jest.fn(),
          findMany: jest.fn(),
          findUnique: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentsService,
        { provide: DatabaseService, useValue: dbMock },
      ],
    }).compile();

    service = module.get<AgentsService>(AgentsService);
    db = module.get<DatabaseService>(DatabaseService);
  });

  describe('findBySlug', () => {
    it('debería retornar el agente si coincide con slug y tenantId', async () => {
      const mockAgent = {
        id: '1',
        slug: 'test-agent',
        tenantId: 'tenant-1',
        isActive: true,
      };
      db.mysql.agent.findFirst.mockResolvedValue(mockAgent);

      const result = await service.findBySlug('test-agent', 'tenant-1');
      expect(result).toEqual(mockAgent);
      expect(db.mysql.agent.findFirst).toHaveBeenCalledWith({
        where: {
          slug: 'test-agent',
          OR: [{ tenantId: 'tenant-1' }, { tenantId: 'GLOBAL' }],
          isActive: true,
        },
      });
    });
  });

  describe('create', () => {
    it('debería crear un agente y establecer isActive en true', async () => {
      const inputData = {
        name: 'AI Agent',
        slug: 'ai-agent',
        prompt: 'test prompt',
        tenantId: 'tenant-1',
      };
      const createdAgent = { id: '1', ...inputData, isActive: true };
      db.mysql.agent.create.mockResolvedValue(createdAgent);

      const result = await service.create(inputData);
      expect(result).toEqual(createdAgent);
      expect(db.mysql.agent.create).toHaveBeenCalledWith({
        data: {
          ...inputData,
          isActive: true,
        },
      });
    });
  });

  describe('findAll', () => {
    it('debería consultar sin filtros de tenant si tenantId es global', async () => {
      await service.findAll('global');
      expect(db.mysql.agent.findMany).toHaveBeenCalledWith({ where: {} });
    });

    it('debería filtrar por tenantId o GLOBAL si tenantId no es global', async () => {
      await service.findAll('tenant-1');
      expect(db.mysql.agent.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ tenantId: 'tenant-1' }, { tenantId: 'GLOBAL' }],
        },
      });
    });
  });

  describe('update', () => {
    it('debería actualizar el agente y poner el status en PRE_PRODUCTION', async () => {
      const updatedAgent = {
        id: '1',
        name: 'Updated Name',
        version: '1.0',
        prompt: 'old prompt',
        status: 'PRE_PRODUCTION',
      };
      db.mysql.agent.update.mockResolvedValue(updatedAgent);

      const result = await service.update('1', { name: 'Updated Name' });
      expect(result).toEqual(updatedAgent);
      expect(db.mysql.agent.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          name: 'Updated Name',
          status: 'PRE_PRODUCTION',
        },
      });
      expect(db.mysql.agentVersion.create).not.toHaveBeenCalled();
    });

    it('debería crear un registro en agentVersion si el prompt es modificado', async () => {
      const updatedAgent = {
        id: '1',
        version: '1.0',
        prompt: 'new prompt',
        status: 'PRE_PRODUCTION',
      };
      db.mysql.agent.update.mockResolvedValue(updatedAgent);

      await service.update('1', { prompt: 'new prompt' });
      expect(db.mysql.agentVersion.create).toHaveBeenCalledWith({
        data: {
          agentId: '1',
          prompt: 'new prompt',
          version: '1.0',
          status: 'PRE_PRODUCTION',
        },
      });
    });
  });

  describe('updateStatus', () => {
    it('debería lanzar un error si el agente no existe', async () => {
      db.mysql.agent.findUnique.mockResolvedValue(null);
      await expect(service.updateStatus('1', 'PRODUCTION')).rejects.toThrow(
        'Agent not found',
      );
    });

    it('debería incrementar la versión en +0.1 si el nuevo status es PRODUCTION', async () => {
      const mockAgent = { id: '1', version: '1.0', prompt: 'prompt test' };
      db.mysql.agent.findUnique.mockResolvedValue(mockAgent);
      const updatedAgent = {
        id: '1',
        version: '1.1',
        prompt: 'prompt test',
        status: 'PRODUCTION',
      };
      db.mysql.agent.update.mockResolvedValue(updatedAgent);

      const result = await service.updateStatus('1', 'PRODUCTION');
      expect(result.version).toBe('1.1');
      expect(db.mysql.agent.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'PRODUCTION', version: '1.1' },
      });
      expect(db.mysql.agentVersion.create).toHaveBeenCalledWith({
        data: {
          agentId: '1',
          prompt: 'prompt test',
          version: '1.1',
          status: 'PRODUCTION',
        },
      });
    });
  });

  describe('findVersions', () => {
    it('debería consultar las versiones de un agente ordenadas de forma descendente', async () => {
      await service.findVersions('1');
      expect(db.mysql.agentVersion.findMany).toHaveBeenCalledWith({
        where: { agentId: '1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('rollback', () => {
    it('debería lanzar un error si la versión no existe', async () => {
      db.mysql.agentVersion.findUnique.mockResolvedValue(null);
      await expect(service.rollback('1', 'v-1')).rejects.toThrow(
        'Version not found',
      );
    });

    it('debería lanzar un error si el agente no existe', async () => {
      db.mysql.agentVersion.findUnique.mockResolvedValue({
        id: 'v-1',
        prompt: 'old prompt',
      });
      db.mysql.agent.findUnique.mockResolvedValue(null);
      await expect(service.rollback('1', 'v-1')).rejects.toThrow(
        'Agent not found',
      );
    });

    it('debería aplicar el prompt de la versión seleccionada e incrementar la versión del agente en +0.1', async () => {
      db.mysql.agentVersion.findUnique.mockResolvedValue({
        id: 'v-1',
        prompt: 'old prompt',
      });
      db.mysql.agent.findUnique.mockResolvedValue({ id: '1', version: '1.2' });

      const updatedAgent = {
        id: '1',
        version: '1.3',
        prompt: 'old prompt',
        status: 'PRODUCTION',
      };
      db.mysql.agent.update.mockResolvedValue(updatedAgent);

      const result = await service.rollback('1', 'v-1');
      expect(result).toEqual(updatedAgent);
      expect(db.mysql.agent.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          prompt: 'old prompt',
          version: '1.3',
          status: 'PRODUCTION',
        },
      });
      expect(db.mysql.agentVersion.create).toHaveBeenCalledWith({
        data: {
          agentId: '1',
          prompt: 'old prompt',
          version: '1.3',
          status: 'PRODUCTION',
        },
      });
    });
  });
});
