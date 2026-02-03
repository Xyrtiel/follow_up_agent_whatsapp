import { Test, TestingModule } from '@nestjs/testing';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';

describe('MessageController', () => {
  let controller: MessageController;

  const mockMessage = { _id: '1', contact_id: 'c1', contenu_message: 'Hello', delai_attente: new Date() };

  const mockService = {
    createMessage: jest.fn(),
    getAllMessages: jest.fn(),
    getMessageById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessageController],
      providers: [{ provide: MessageService, useValue: mockService }],
    }).compile();

    controller = module.get<MessageController>(MessageController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.createMessage and return value', async () => {
      const dto = { contact_id: 'c1', contenu_message: 'Hello', delai_attente: new Date() };
      mockService.createMessage.mockResolvedValue(mockMessage);

      const res = await controller.create(dto as any);
      expect(mockService.createMessage).toHaveBeenCalledWith(dto);
      expect(res).toEqual(mockMessage);
    });
  });

  describe('findAll', () => {
    it('should call service.getAllMessages and return value', async () => {
      mockService.getAllMessages.mockResolvedValue([mockMessage]);

      const res = await controller.findAll();
      expect(mockService.getAllMessages).toHaveBeenCalled();
      expect(res).toEqual([mockMessage]);
    });
  });

  describe('findOne', () => {
    it('should call service.getMessageById and return value', async () => {
      mockService.getMessageById.mockResolvedValue(mockMessage);

      const res = await controller.findOne('1');
      expect(mockService.getMessageById).toHaveBeenCalledWith('1');
      expect(res).toEqual(mockMessage);
    });
  });
});
