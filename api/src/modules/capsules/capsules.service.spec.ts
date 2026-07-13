import { Test, TestingModule } from '@nestjs/testing';
import { CapsulesService } from './capsules.service';
import { DatabaseService } from '../../common/database/database.service';
import { AiService } from '../ai/ai.service';
import { ConversationsService } from '../conversations/conversations.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { WorkflowsService } from '../crm/workflows.service';
import { CrmService } from '../crm/crm.service';

describe('CapsulesService (Unit Tests)', () => {
  let service: CapsulesService;
  let db: any;

  beforeEach(async () => {
    // Mock del DatabaseService
    const dbMock = {
      mysql: {
        capsule: {
          findFirst: jest.fn(),
          delete: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CapsulesService,
        { provide: DatabaseService, useValue: dbMock },
        { provide: AiService, useValue: {} },
        { provide: ConversationsService, useValue: {} },
        { provide: WorkflowsService, useValue: {} },
        { provide: CrmService, useValue: {} },
      ],
    }).compile();

    service = module.get<CapsulesService>(CapsulesService);
    db = module.get<DatabaseService>(DatabaseService);
  });

  describe('remove', () => {
    it('debería lanzar NotFoundException si la cápsula no existe', async () => {
      db.mysql.capsule.findFirst.mockResolvedValue(null);
      await expect(service.remove('1', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debería lanzar ConflictException si la cápsula está PUBLISHED', async () => {
      db.mysql.capsule.findFirst.mockResolvedValue({
        id: '1',
        status: 'PUBLISHED',
        campaigns: [],
      });

      await expect(service.remove('1', 'tenant-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('debería lanzar ConflictException si tiene campañas enviadas', async () => {
      db.mysql.capsule.findFirst.mockResolvedValue({
        id: '1',
        status: 'DRAFT',
        campaigns: [{ sentAt: new Date() }],
      });

      await expect(service.remove('1', 'tenant-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('debería permitir el borrado si es DRAFT y no tiene campañas enviadas', async () => {
      db.mysql.capsule.findFirst.mockResolvedValue({
        id: '1',
        status: 'DRAFT',
        campaigns: [{ sentAt: null }],
      });
      db.mysql.capsule.delete.mockResolvedValue({ id: '1' });

      const result = await service.remove('1', 'tenant-1');
      expect(result).toBeDefined();
      expect(db.mysql.capsule.delete).toHaveBeenCalled();
    });
  });
});
