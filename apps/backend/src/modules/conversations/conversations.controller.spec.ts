jest.mock('./conversations.service', () => ({
  ConversationsService: class MockConversationsService {
    search = jest.fn();
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

describe('ConversationsController', () => {
  let controller: ConversationsController;
  let conversationsService: { search: jest.Mock };

  beforeEach(async () => {
    conversationsService = {
      search: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationsController],
      providers: [
        {
          provide: ConversationsService,
          useValue: conversationsService,
        },
      ],
    }).compile();

    controller = module.get<ConversationsController>(ConversationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should use authenticated user id when searching', async () => {
    conversationsService.search.mockResolvedValue({
      contacts: [],
      groups: [],
      messages: [],
      files: [],
    });

    const req = {
      user: {
        userId: '507f1f77bcf86cd799439011',
      },
    };

    await controller.search(req, {
      userId: '507f1f77bcf86cd799439012',
      keyword: 'hello',
      scope: 'all',
      limit: '5',
    });

    expect(conversationsService.search).toHaveBeenCalledWith({
      userId: '507f1f77bcf86cd799439011',
      keyword: 'hello',
      scope: 'all',
      limit: '5',
    });
  });
});
