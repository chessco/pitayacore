import { Test, TestingModule } from '@nestjs/testing';
import { ChatSessionsController } from './chat-sessions.controller';

describe('ChatSessionsController', () => {
  let controller: ChatSessionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatSessionsController],
    }).compile();

    controller = module.get<ChatSessionsController>(ChatSessionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
