import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Contact, etat_contact } from '../contact/contact.schema';
import { Model } from 'mongoose';

async function run() {
  console.log('[add_manual_contact] Initializing script to add or update a contact.');

  const appContext = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  
  try {
    const contactModel = appContext.get<Model<Contact>>(getModelToken(Contact.name));

    const envTarget = process.env.TARGET_PHONE_NUMBER || '';
    const phone = envTarget.replace(/^whatsapp:/i, '').trim();

    if (!phone) {
      console.error('[add_manual_contact] Error: TARGET_PHONE_NUMBER is not defined in the environment file.');
      process.exit(1);
    }

    const name = 'Geoffrey';

    const existing = await contactModel.findOne({ numero_telephone: phone }).exec();

    if (existing) {
      console.log(`[add_manual_contact] Contact found for phone number ${phone}. Updating entry.`);
      existing.nom = name;
      // On remet l'état à NOT_CONTACTED pour pouvoir relancer un test propre si besoin
      existing.etat_contact = etat_contact.NOT_CONTACTED;
      await existing.save();
      console.log(`[add_manual_contact] Successfully updated contact '${name}' (ID: ${existing._id}). State has been reset to NOT_CONTACTED.`);
    } else {
      const newContact = await contactModel.create({
        nom: name,
        numero_telephone: phone,
        etat_contact: etat_contact.NOT_CONTACTED,
      });
      console.log(`[add_manual_contact] Successfully created new contact '${newContact.nom}' (ID: ${newContact._id}).`);
    }

  } catch (error) {
    console.error('[add_manual_contact] An unexpected error occurred:', error);
  } finally {
    await appContext.close();
    process.exit(0);
  }
}

run().catch((e) => {
  console.error('[add_manual_contact] Unhandled error during script execution:', e);
  process.exit(1);
});
