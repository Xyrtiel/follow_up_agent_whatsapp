import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { WhatsAppService } from './send_whatsapp_message';

async function run() {
  console.log('[send_live_followup] Starting live follow-up script');

  const appContext = await NestFactory.createApplicationContext(AppModule, { logger: ['log','error','warn','debug'] });
  const whatsappService = appContext.get(WhatsAppService);

  const envTarget = process.env.TARGET_PHONE_NUMBER || '';
  const phone = envTarget.replace(/^whatsapp:/i, '').trim();
  if (!phone) {
    console.error('TARGET_PHONE_NUMBER is not set in .env (or empty)');
    await appContext.close();
    process.exit(1);
  }

  const contactName = process.env.TEST_CONTACT_NAME || 'Contact';
  console.log(`[send_live_followup] Using target ${phone} and name ${contactName}`);

  try {
    console.log('[send_live_followup] Generating first message (AI or fallback)...');
    const result = await whatsappService.sendFollowUpWithAgent(phone, contactName);
    console.log('[send_live_followup] sendFollowUpWithAgent returned:', result);

    console.log('[send_live_followup] The process will stay alive for 21 minutes to allow the 20-minute follow-up to run.');
    // keep alive for 21 minutes so the in-memory timer in WhatsAppService can fire
    await new Promise((resolve) => setTimeout(resolve, 21 * 60 * 1000));

    console.log('[send_live_followup] Done waiting. Closing app context.');
  } catch (err) {
    console.error('[send_live_followup] Error running live follow-up:', err);
  } finally {
    await appContext.close();
    process.exit(0);
  }
}

run().catch((e) => {
  console.error('Unhandled error in send_live_followup', e);
  process.exit(1);
});
