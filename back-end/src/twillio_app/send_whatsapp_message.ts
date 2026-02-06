import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import twilio from 'twilio';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contact, etat_contact } from '../contact/contact.schema';
import { Message } from '../message/message.schema';
import { WhatsAppAgentService } from './whatsapp-agent.service';

const accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
const authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
const fromEnv = (process.env.TWILIO_WHATSAPP_NUMBER || '').trim();

if (!accountSid || !authToken) {
  throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set in environment variables (or in the root .env).');
}
if (!fromEnv) {
  throw new Error('TWILIO_WHATSAPP_NUMBER must be set in environment variables (or in the root .env).');
}

@Injectable()
export class WhatsAppService {
  private readonly client: ReturnType<typeof twilio>;
  private readonly defaultFrom: string;
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly followUpTimers = new Map<string, NodeJS.Timeout>();
  private readonly dryRun: boolean;

  constructor(
    @InjectModel(Contact.name) private contactModel: Model<Contact>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
    private whatsappAgent: WhatsAppAgentService,
  ) {
    this.client = twilio(accountSid, authToken) as ReturnType<typeof twilio>;
    this.defaultFrom = fromEnv.startsWith('whatsapp:') ? fromEnv : `whatsapp:${fromEnv}`;
    this.dryRun = process.env.TWILIO_DRY_RUN === 'true';
    if (this.dryRun) {
      this.logger.log('[WhatsAppService] running in DRY-RUN mode (no network requests)');
    }
  }

  private normalizeNumber(n: string) {
    return n.startsWith('whatsapp:') ? n : `whatsapp:${n}`;
  }

  /**
   * Orchestration complète : crée contact, génère messages, envoie 1er message, programme relance 20 min
   */
  async sendFollowUpWithAgent(
    phoneNumber: string,
    contactName: string,
    context?: string,
    from?: string,
  ) {
    const targetTo = this.normalizeNumber(phoneNumber);
    const fromNumber = from ? this.normalizeNumber(from) : this.defaultFrom;

    this.whatsappAgent.logAction(
      `Starting follow-up workflow for ${contactName} (${phoneNumber})`,
    );

    let contact: Contact | null = null;
    try {
      // 1) Générer plan d'action
      const actionPlan = await this.whatsappAgent.generateActionPlan(
        contactName,
        context,
      );
      this.whatsappAgent.logAction(
        `Action plan generated for ${contactName}`,
        actionPlan,
      );

      // Pause de 2 secondes pour éviter de saturer le quota (429) entre deux appels IA
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 2) Générer 1er message
      const firstMessage = await this.whatsappAgent.generateFirstMessage(
        contactName,
        context,
      );
      this.whatsappAgent.logAction(`First message generated for ${contactName}`);

      // 3) Créer/Mettre à jour contact en BDD
      contact = await this.contactModel.findOne({
        numero_telephone: phoneNumber,
      });
      if (!contact) {
        contact = await this.contactModel.create({
          nom: contactName,
          numero_telephone: phoneNumber,
          // Mark as contacted immediately after sending first message
          etat_contact: etat_contact.FOLLOWED_UP,
          first_message: firstMessage,
          lastMessageSentAt: new Date(),
        });
        this.whatsappAgent.logAction(`Contact created: ${contactName}`);
      } else {
        contact.first_message = firstMessage;
        // Mark as contacted when we send the first message
        contact.etat_contact = etat_contact.FOLLOWED_UP;
        contact.lastMessageSentAt = new Date();
        await contact.save();
        this.whatsappAgent.logAction(`Contact updated: ${contactName}`);
      }

      // 4) Envoyer 1er message via Twilio
      const messageSid = await this.sendWhatsAppMessage(
        targetTo,
        firstMessage,
        fromNumber,
      );
      this.whatsappAgent.logAction(
        `First message sent to ${contactName}`,
        { sid: messageSid },
      );

      // 5) Enregistrer le message en BDD
      await this.messageModel.create({
        contact_id: contact._id.toString(),
        contenu_message: firstMessage,
        delai_attente: new Date(),
      });
      this.whatsappAgent.logAction(
        `Message logged in database for ${contactName}`,
      );

      // 6) Programmer la relance 20 minutes après
      this.scheduleFollowUp(targetTo, contactName, contact._id.toString(), fromNumber);

      return {
        success: true,
        contactId: contact._id,
        messageSid,
        actionPlan,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send follow-up for ${contactName}:`,
        error,
      );
      if (contact) {
        contact.etat_contact = etat_contact.INVALID_CONTACT;
        await contact.save();
        this.whatsappAgent.logAction(`Contact marked as INVALID_CONTACT due to error: ${contactName}`);
      }
      throw error;
    }
  }

  /**
   * Programme une relance 20 minutes après si pas de réponse
   */
  private scheduleFollowUp(
    to: string,
    contactName: string,
    contactId: string,
    from: string,
    delayMs = 20 * 60 * 1000, // 20 minutes par défaut
  ) {
    // Annuler un timer existant si présent
    if (this.followUpTimers.has(to)) {
      clearTimeout(this.followUpTimers.get(to));
    }

    const timer = setTimeout(async () => {
      this.whatsappAgent.logAction(
        `20 minutes elapsed, checking response for ${contactName}`,
      );

      // Vérifier si le contact a répondu
      const contact = await this.contactModel.findById(contactId);
      if (
        contact &&
        // If we previously contacted them but they didn't reply, send the reminder
        contact.etat_contact === etat_contact.FOLLOWED_UP
      ) {
        // Pas de réponse, envoyer 2e message
        await this.sendSecondFollowUp(
          to,
          contactName,
          contact.first_message,
          contactId,
          from,
        );
      } else {
        this.whatsappAgent.logAction(
          `Contact ${contactName} already responded or status updated`,
        );
      }

      this.followUpTimers.delete(to);
    }, delayMs);

    this.followUpTimers.set(to, timer);
    // persist scheduled time
    this.contactModel.findByIdAndUpdate(contactId, { followUpScheduledAt: new Date() }).catch(() => {});
    this.whatsappAgent.logAction(
      `Follow-up scheduled for ${contactName} in ${delayMs / 1000}s`,
    );
  }

  /**
   * Envoie le 2e message si pas de réponse après 20 min
   */
  private async sendSecondFollowUp(
    to: string,
    contactName: string,
    firstMessage: string,
    contactId: string,
    from: string,
  ) {
    try {
      this.whatsappAgent.logAction(
        `Generating second follow-up message for ${contactName}`,
      );

      // Générer 2e message DIFFÉRENT
      const secondMessage = await this.whatsappAgent.generateSecondMessage(
        contactName,
        firstMessage,
      );
      this.whatsappAgent.logAction(
        `Second message generated for ${contactName}`,
      );

      // Envoyer 2e message
      const messageSid = await this.sendWhatsAppMessage(to, secondMessage, from);
      this.whatsappAgent.logAction(
        `Second message sent to ${contactName}`,
        { sid: messageSid },
      );

      // Mettre à jour contact en BDD
      await this.contactModel.findByIdAndUpdate(contactId, {
        $set: {
          second_message: secondMessage,
          etat_contact: etat_contact.FOLLOWED_UP_REMINDER,
          lastMessageSentAt: new Date(),
        },
        $unset: { followUpScheduledAt: 1 },
      });
      this.whatsappAgent.logAction(
        `Contact updated to FOLLOWED_UP_REMINDER for ${contactName}`,
      );

      // Enregistrer le 2e message en BDD
      await this.messageModel.create({
        contact_id: contactId,
        contenu_message: secondMessage,
        delai_attente: new Date(),
      });
      this.whatsappAgent.logAction(
        `Second message logged in database for ${contactName}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send second follow-up for ${contactName}:`,
        error,
      );
    }
  }

  /**
   * Annule la relance programmée si le contact répond
   */
  cancelFollowUp(phoneNumber: string) {
    const normalizedNumber = this.normalizeNumber(phoneNumber);
    if (this.followUpTimers.has(normalizedNumber)) {
      clearTimeout(this.followUpTimers.get(normalizedNumber));
      this.followUpTimers.delete(normalizedNumber);
      this.whatsappAgent.logAction(
        `Follow-up cancelled for ${normalizedNumber}`,
      );
    }
  }

  /**
   * Met à jour l'état du contact
   */
  async updateContactStatus(contactId: string, status: etat_contact) {
    const contact = await this.contactModel.findByIdAndUpdate(
      contactId,
      { etat_contact: status },
      { new: true },
    );
    this.whatsappAgent.logAction(
      `Contact status updated to ${status}`,
      { contactId },
    );
    return contact;
  }

  private async sendWhatsAppMessage(
    to: string,
    messageBody: string,
    from?: string,
  ) {
    const fromNumber = from || this.defaultFrom;

    if (this.dryRun) {
      const fakeId = `dry-run-${Date.now()}`;
      this.logger.log(`[dry-run] would send to ${to}: ${messageBody}`);
      return fakeId;
    }

    try {
      const message = await this.client.messages.create({
        body: messageBody,
        from: fromNumber,
        to,
      });
      return message.sid;
    } catch (error: any) {
      this.logger.error('Failed to send WhatsApp message', {
        to,
        from: fromNumber,
        error: error?.message,
      });
      throw error;
    }
  }
}