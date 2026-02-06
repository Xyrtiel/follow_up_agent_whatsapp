import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { WhatsAppService } from './send_whatsapp_message';
import { getModelToken } from '@nestjs/mongoose';
import { Contact } from '../contact/contact.schema';
import { Model } from 'mongoose';

async function run() {
  console.log('[send_live_followup] Starting live follow-up script');

  const appContext = await NestFactory.createApplicationContext(AppModule, { logger: ['log','error','warn','debug'] });
  const whatsappService = appContext.get(WhatsAppService);
  const contactModel = appContext.get<Model<Contact>>(getModelToken(Contact.name));

  const envTarget = process.env.TARGET_PHONE_NUMBER || '';
  const phone = envTarget.replace(/^whatsapp:/i, '').trim();
  if (!phone) {
    console.error('TARGET_PHONE_NUMBER is not set in .env (or empty)');
    await appContext.close();
    process.exit(1);
  }

  // Chercher le contact dans la BDD pour récupérer son nom.
  const existingContact = await contactModel.findOne({ numero_telephone: phone }).exec();

  // Utiliser le nom existant, ou un nom par défaut si le contact n'existe pas encore.
  const contactName = existingContact ? existingContact.nom : (process.env.TEST_CONTACT_NAME || 'Geoffrey');
  // AJOUT : Le contexte est une exigence clé du test pour évaluer le raisonnement de l'agent.
  const context = "Premier échange informel la semaine précédente, Intérêt exprimé, Aucune suite donnée depuis.";

  console.log(`[send_live_followup] Using target ${phone} and name ${contactName}`);

  try {
    console.log('[send_live_followup] Generating first message (AI or fallback)...');
    // MODIFICATION : Le contexte est maintenant passé à l'agent.
    const result = await whatsappService.sendFollowUpWithAgent(phone, contactName, context);
    console.log('[send_live_followup] sendFollowUpWithAgent returned:', result);

    console.log('[send_live_followup] The process will now stay alive to allow the follow-up workflow to complete. Press Ctrl+C to exit.');
    // Keep the process alive indefinitely
    await new Promise(() => {});

  } catch (err) {
    console.error('[send_live_followup] Error running live follow-up:', err);
    await appContext.close();
    process.exit(1); // Exit with an error code on failure
  }
}

run().catch((e) => {
  console.error('Unhandled error in send_live_followup', e);
  process.exit(1);
});
