import { Controller, Post, Req, Res, Inject, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contact, etat_contact } from '../contact/contact.schema';
import { WhatsAppService } from './send_whatsapp_message';
import twilio from 'twilio';

const { twiml } = twilio;

@Controller('whatsapp')
export class WhatsAppReceiverController {
  private readonly logger = new Logger(WhatsAppReceiverController.name);

  constructor(
    @InjectModel(Contact.name) private contactModel: Model<Contact>,
    private whatsappService: WhatsAppService,
  ) {}

  @Post()
  async handleIncomingMessage(@Req() req: any, @Res() res: any) {
    try {
      // Extraire le numéro de téléphone et le message du corps de la requête Twilio
      const from = req.body.From || ''; // whatsapp:+1234567890
      const messageBody = req.body.Body || '';
      
      this.logger.log(`Incoming message from ${from}: ${messageBody}`);

      // Normaliser le numéro (enlever "whatsapp:" si présent)
      const phoneNumber = from.replace('whatsapp:', '').trim();

      // Chercher le contact dans MongoDB
      let contact = await this.contactModel.findOne({
        numero_telephone: phoneNumber,
      });

      if (contact) {
        // Contact trouvé : marquer comme ayant accepté après réponse
        contact.etat_contact = etat_contact.ACCEPTED;
        contact.lastMessageSentAt = new Date();
        contact.followUpScheduledAt = undefined;
        await contact.save();
        this.logger.log(
          `✅ Message reçu de ${contact.nom}. Le statut du contact est maintenant: ACCEPTED.`,
        );

        // Annuler tout timer de relance programmé
        this.whatsappService.cancelFollowUp(phoneNumber);
      } else {
        this.logger.warn(
          `Received message from unknown contact: ${phoneNumber}`,
        );
      }

      // Répondre avec un message de confirmation Twilio
      const response = new twiml.MessagingResponse();
      response.message('Merci pour votre message! Nous avons reçu votre réponse.');
      res.type('text/xml').send(response.toString());
    } catch (error) {
      this.logger.error('Error handling incoming message', error);
      const response = new twiml.MessagingResponse();
      response.message('Merci pour votre message.');
      res.type('text/xml').send(response.toString());
    }
  }
}