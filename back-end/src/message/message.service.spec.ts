import { Test, TestingModule } from '@nestjs/testing';
import { MessageService } from './message.service';
import { getModelToken } from '@nestjs/mongoose';

describe('MessageService', () => {
  let service: MessageService;

  const mockMessage = { _id: '1', contact_id: 'c1', contenu_message: 'Hello', delai_attente: new Date() };

  const mockModel = {
    find: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        { provide: getModelToken('Message'), useValue: mockModel },
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMessage', () => {
    it('should create and return a message', async () => {
      const dto = { contact_id: 'c1', contenu_message: 'Hello', delai_attente: new Date() };
      const created = { ...dto, _id: '1' };

      const FakeConstructor: any = function (payload) {
        this.save = jest.fn().mockResolvedValue(created);
      };

      // inject fake constructor as model
      (service as any).messageModel = FakeConstructor;

      const res = await service.createMessage(dto as any);
      expect(res).toEqual(created);
    });
  });

  describe('getAllMessages', () => {
    it('should return array of messages', async () => {
      mockModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([mockMessage]) });
      (service as any).messageModel = mockModel as any;

      const res = await service.getAllMessages();
      expect(mockModel.find).toHaveBeenCalled();
      expect(res).toEqual([mockMessage]);
    });

    it('should return empty array when none', async () => {
      mockModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
      (service as any).messageModel = mockModel as any;

      const res = await service.getAllMessages();
      expect(res).toEqual([]);
    });
  });

  describe('getMessageById', () => {
    it('should return message when found', async () => {
      mockModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockMessage) });
      (service as any).messageModel = mockModel as any;

      const res = await service.getMessageById('1');
      expect(mockModel.findById).toHaveBeenCalledWith('1');
      expect(res).toEqual(mockMessage);
    });

    it('should return null when not found', async () => {
      mockModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      (service as any).messageModel = mockModel as any;

      const res = await service.getMessageById('no-id');
      expect(res).toBeNull();
    });
  });
});
