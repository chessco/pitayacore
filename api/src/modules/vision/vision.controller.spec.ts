import { Test, TestingModule } from '@nestjs/testing';
import { VisionController } from './vision.controller';
import { VisionService } from './vision.service';
import { ConfigService } from '@nestjs/config';
import { FalProvider } from '../../infrastructure/providers/image/fal.provider';

describe('VisionController', () => {
  let controller: VisionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VisionController],
      providers: [
        { provide: VisionService, useValue: {} },
        { provide: FalProvider, useValue: {} },
        { provide: ConfigService, useValue: {} },
      ],
    }).compile();

    controller = module.get<VisionController>(VisionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
