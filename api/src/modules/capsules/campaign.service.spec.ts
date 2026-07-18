import { Test, TestingModule } from '@nestjs/testing';
import { CampaignService } from './campaign.service';
import { DatabaseService } from '../../common/database/database.service';
import { MailService } from '../../common/mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { WhatsappWebProvider } from '../communication/providers/whatsapp-web/whatsapp-web.provider';

jest.mock('marked', () => ({
  marked: {
    parse: jest.fn((text) => text),
  },
}));
describe('CampaignService (Unit Tests)', () => {
  let service: CampaignService;
  let db: any;

  beforeEach(async () => {
    const dbMock = {
      mysql: {
        campaign: {
          findFirst: jest.fn(),
          delete: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignService,
        { provide: DatabaseService, useValue: dbMock },
        { provide: MailService, useValue: {} },
        { provide: ConfigService, useValue: {} },
        { provide: WhatsappWebProvider, useValue: {} },
      ],
    }).compile();

    service = module.get<CampaignService>(CampaignService);
    db = module.get<DatabaseService>(DatabaseService);
  });

  describe('removeCampaign', () => {
    it('debería lanzar NotFoundException si la campaña no existe', async () => {
      db.mysql.campaign.findFirst.mockResolvedValue(null);
      await expect(
        service.removeCampaign('tenant-1', 'camp-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar ConflictException si la campaña ya fue enviada', async () => {
      db.mysql.campaign.findFirst.mockResolvedValue({
        id: 'camp-1',
        sentAt: new Date(),
      });

      await expect(
        service.removeCampaign('tenant-1', 'camp-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('debería borrar exitosamente si la campaña no ha sido enviada', async () => {
      db.mysql.campaign.findFirst.mockResolvedValue({
        id: 'camp-1',
        sentAt: null,
      });
      db.mysql.campaign.delete.mockResolvedValue({ id: 'camp-1' });

      const result = await service.removeCampaign('tenant-1', 'camp-1');
      expect(result).toBeDefined();
      expect(db.mysql.campaign.delete).toHaveBeenCalled();
    });
  });
});
