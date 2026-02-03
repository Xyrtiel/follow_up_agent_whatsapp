import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ContactService } from './contact.service';
import { etat_contact } from './contact.schema';

describe('ContactService', () => {
  let service: ContactService;
  const mockContact = { _id: '1', name: 'John Doe', numero_telephone: '+33123456789', etat_contact: etat_contact.NOT_CONTACTED };

  const mockModel = {
    // used with `new mockModel()` inside service
    // constructor -> returns object with save()
    mockCreate: jest.fn().mockImplementation((dto) => ({ ...dto, _id: '1', save: jest.fn().mockResolvedValue({ ...dto, _id: '1' }) })),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndRemove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactService,
        { provide: getModelToken('Contact'), useValue: mockModel },
      ],
    }).compile();

    service = module.get<ContactService>(ContactService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createContact', () => {
    it('should create and return a contact', async () => {
      // override so that calling `new (mockModel as any)(dto)` returns expected object
      const dto = { name: 'John Doe', numero_telephone: '+33123456789' };
      const Created = { ...dto, _id: '1' };

      const FakeConstructor: any = function (payload) {
        this.save = jest.fn().mockResolvedValue(Created);
      };

      // replace the provider value used by the service for instantiation
      (service as any).contactModel = FakeConstructor;

      const result = await service.createContact(dto.name, dto.numero_telephone);
      expect(result).toEqual(Created);
    });
  });

  describe('findContactByPhone', () => {
    it('should return contact when found', async () => {
      const found = { ...mockContact };
      mockModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(found) });

      (service as any).contactModel = mockModel as any;

      const res = await service.findContactByPhone(mockContact.numero_telephone);
      expect(mockModel.findOne).toHaveBeenCalledWith({ numero_telephone: mockContact.numero_telephone });
      expect(res).toEqual(found);
    });

    it('should return null when not found', async () => {
      mockModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      (service as any).contactModel = mockModel as any;

      const res = await service.findContactByPhone('+390000000');
      expect(res).toBeNull();
    });
  });

  describe('updateContactStatus', () => {
    it('should update and return the contact', async () => {
      const updated = { ...mockContact, etat_contact: etat_contact.ACCEPTED };
      mockModel.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(updated) });
      (service as any).contactModel = mockModel as any;

      const res = await service.updateContactStatus('1', etat_contact.ACCEPTED);
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith('1', { etat_contact: etat_contact.ACCEPTED }, { new: true });
      expect(res).toEqual(updated);
    });

    it('should return null if id does not exist', async () => {
      mockModel.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      (service as any).contactModel = mockModel as any;

      const res = await service.updateContactStatus('non-existent-id', etat_contact.ACCEPTED);
      expect(res).toBeNull();
    });
  });

  describe('removeContact', () => {
    it('should remove and return the contact', async () => {
      mockModel.findByIdAndRemove.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockContact) });
      (service as any).contactModel = mockModel as any;

      const res = await service.removeContact('1');
      expect(mockModel.findByIdAndRemove).toHaveBeenCalledWith('1');
      expect(res).toEqual(mockContact);
    });

    it('should return null if not found', async () => {
      mockModel.findByIdAndRemove.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      (service as any).contactModel = mockModel as any;

      const res = await service.removeContact('no-id');
      expect(res).toBeNull();
    });
  });
});

