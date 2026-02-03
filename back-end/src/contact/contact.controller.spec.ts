import { Test, TestingModule } from '@nestjs/testing';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { etat_contact } from './contact.schema';

describe('ContactController', () => {
  let controller: ContactController;

  const mockContact = { _id: '1', name: 'John Doe', numero_telephone: '+33123456789', etat_contact: etat_contact.NOT_CONTACTED };

  const mockService = {
    createContact: jest.fn(),
    findContactByPhone: jest.fn(),
    updateContactStatus: jest.fn(),
    removeContact: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactController],
      providers: [{ provide: ContactService, useValue: mockService }],
    }).compile();

    controller = module.get<ContactController>(ContactController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.createContact and return value', async () => {
      const dto = { name: 'John Doe', numero_telephone: '+33123456789' };
      mockService.createContact.mockResolvedValue(mockContact);

      const res = await controller.create(dto as any);
      expect(mockService.createContact).toHaveBeenCalledWith(dto.name, dto.numero_telephone);
      expect(res).toEqual(mockContact);
    });
  });

  describe('findOne', () => {
    it('should call service.findContactByPhone and return value', async () => {
      mockService.findContactByPhone.mockResolvedValue(mockContact);

      const res = await controller.findOne(mockContact.numero_telephone);
      expect(mockService.findContactByPhone).toHaveBeenCalledWith(mockContact.numero_telephone);
      expect(res).toEqual(mockContact);
    });
  });

  describe('updateStatus', () => {
    it('should call service.updateContactStatus and return updated', async () => {
      const updated = { ...mockContact, etat_contact: etat_contact.ACCEPTED };
      mockService.updateContactStatus.mockResolvedValue(updated);

      const res = await controller.updateStatus('1', etat_contact.ACCEPTED);
      expect(mockService.updateContactStatus).toHaveBeenCalledWith('1', etat_contact.ACCEPTED);
      expect(res).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should call service.removeContact and return removed contact', async () => {
      mockService.removeContact.mockResolvedValue(mockContact);

      const res = await controller.remove('1');
      expect(mockService.removeContact).toHaveBeenCalledWith('1');
      expect(res).toEqual(mockContact);
    });
  });
});
