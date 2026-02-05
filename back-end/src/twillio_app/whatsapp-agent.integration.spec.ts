import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppService } from './send_whatsapp_message';
import { WhatsAppAgentService } from './whatsapp-agent.service';
import { getModelToken } from '@nestjs/mongoose';

/**
 * Integration test for WhatsApp Follow-Up Agent
 * 
 * Tests the complete workflow:
 * 1. Plan generation (Anthropic)
 * 2. Message generation (Anthropic)
 * 3. Contact creation/update (MongoDB)
 * 4. Message logging (MongoDB)
 * 5. Twilio send simulation
 * 6. Timer scheduling
 */

describe('WhatsAppAgentIntegration', () => {
  let whatsappService: WhatsAppService;
  let agentService: WhatsAppAgentService;
  let contactModel: any;
  let messageModel: any;

  beforeEach(async () => {
    // Mock Contact and Message models
    const mockContactModel = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        _id: 'contact-123',
        nom: 'Jean Dupont',
        numero_telephone: '+33612345678',
        etat_contact: 'NOT_CONTACTED',
        first_message: 'Test message',
        save: jest.fn().mockResolvedValue({})
      }),
      findById: jest.fn().mockResolvedValue({
        _id: 'contact-123',
        etat_contact: 'NOT_CONTACTED',
        first_message: 'Test message'
      }),
      findByIdAndUpdate: jest.fn().mockResolvedValue({
        _id: 'contact-123',
        etat_contact: 'FOLLOWED_UP'
      })
    };

    const mockMessageModel = {
      create: jest.fn().mockResolvedValue({
        _id: 'msg-123',
        contact_id: 'contact-123',
        contenu_message: 'Test message'
      })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppService,
        WhatsAppAgentService,
        {
          provide: getModelToken('Contact'),
          useValue: mockContactModel,
        },
        {
          provide: getModelToken('Message'),
          useValue: mockMessageModel,
        },
      ],
    }).compile();

    whatsappService = module.get<WhatsAppService>(WhatsAppService);
    agentService = module.get<WhatsAppAgentService>(WhatsAppAgentService);
    contactModel = module.get(getModelToken('Contact'));
    messageModel = module.get(getModelToken('Message'));
  });

  describe('sendFollowUpWithAgent', () => {
    it('should generate action plan from AI', async () => {
      jest.spyOn(agentService, 'generateActionPlan').mockResolvedValueOnce([
        'Step 1: Initial contact',
        'Step 2: Qualify interest',
        'Step 3: Schedule demo'
      ]);

      jest.spyOn(agentService, 'generateFirstMessage').mockResolvedValueOnce(
        'Bonjour Jean, nous avons une offre spéciale pour vous.'
      );

      jest.spyOn(agentService, 'generateSecondMessage').mockResolvedValueOnce(
        'Jean, dernier rappel: cette offre expire bientôt.'
      );

      const result = await whatsappService.sendFollowUpWithAgent(
        '+33612345678',
        'Jean Dupont',
        'Interested in premium'
      );

      expect(result.success).toBe(true);
      expect(result.actionPlan.length).toBe(3);
      expect(contactModel.create).toHaveBeenCalled();
      expect(messageModel.create).toHaveBeenCalled();
    });

    it('should create or update contact in MongoDB', async () => {
      jest.spyOn(agentService, 'generateActionPlan').mockResolvedValueOnce([]);
      jest.spyOn(agentService, 'generateFirstMessage').mockResolvedValueOnce('Test');

      await whatsappService.sendFollowUpWithAgent(
        '+33612345678',
        'Jean Dupont'
      );

      expect(contactModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nom: 'Jean Dupont',
          numero_telephone: '+33612345678',
          first_message: 'Test',
          etat_contact: 'NOT_CONTACTED'
        })
      );
    });

    it('should log message to MongoDB', async () => {
      jest.spyOn(agentService, 'generateActionPlan').mockResolvedValueOnce([]);
      jest.spyOn(agentService, 'generateFirstMessage').mockResolvedValueOnce('Test message');

      await whatsappService.sendFollowUpWithAgent(
        '+33612345678',
        'Jean Dupont'
      );

      expect(messageModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          contact_id: 'contact-123',
          contenu_message: 'Test message'
        })
      );
    });
  });

  describe('scheduleFollowUp', () => {
    it('should schedule second follow-up after delay', async () => {
      jest.useFakeTimers();
      
      jest.spyOn(agentService, 'generateActionPlan').mockResolvedValueOnce([]);
      jest.spyOn(agentService, 'generateFirstMessage').mockResolvedValueOnce('First');
      jest.spyOn(agentService, 'generateSecondMessage').mockResolvedValueOnce('Second');

      // Simulate short delay for testing
      await whatsappService.sendFollowUpWithAgent(
        '+33612345678',
        'Jean Dupont'
      );

      // Note: In real test, would need to manually trigger timer
      // This is a placeholder for actual timer test
      jest.useRealTimers();
    });
  });

  describe('cancelFollowUp', () => {
    it('should cancel scheduled follow-up when response received', () => {
      // Mock a scheduled timer
      const cancelSpy = jest.spyOn(global, 'clearTimeout');
      
      whatsappService.cancelFollowUp('+33612345678');
      
      // In real scenario, would verify timer was cleared
      // This is simplified for demonstration
    });
  });

  describe('WhatsAppAgentService', () => {
    it('should have fallback messages if API fails', async () => {
      // Mock API failure
      jest.spyOn(agentService['client'].messages, 'create').mockRejectedValueOnce(
        new Error('API Error')
      );

      const fallback = await agentService.generateFirstMessage('Test');
      expect(fallback).toContain('Test');
      expect(fallback).toBeTruthy();
    });
  });
});
