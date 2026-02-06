import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import { WhatsAppReceiverController } from './receive_whatsapp_message';
import { etat_contact } from '../contact/contact.schema';

async function run() {
  // Mock contact model
  const mockContact = {
    findOne: async (q: any) => {
      if (q.numero_telephone === '+3369172333') {
        return {
          _id: 'mockid123',
          nom: 'Sim User',
          numero_telephone: '+3369172333',
          etat_contact: etat_contact.NOT_CONTACTED,
          save: async function () {
            this._saved = true;
            return this;
          },
        };
      }
      return null;
    },
  } as any;

  // Mock whatsapp service
  const mockWhatsAppService = {
    cancelFollowUp: (phone: string) => {
      console.log('[mockWhatsAppService] cancelFollowUp called for', phone);
    },
  } as any;

  const controller = new WhatsAppReceiverController(mockContact, mockWhatsAppService);

  // Mock req/res
  const req = { body: { From: 'whatsapp:+33123456789', Body: 'Hello' } } as any;
  const res = {
    type: function (_t: string) {
      return { send: (s: string) => console.log('[response xml]\n', s) };
    },
  } as any;

  console.log('\n-- Running webhook simulation: known contact (should cancel) --');
  await controller.handleIncomingMessage(req, res);

  console.log('\n-- Running webhook simulation: unknown contact --');
  const req2 = { body: { From: 'whatsapp:+33999999999', Body: 'Hi' } } as any;
  await controller.handleIncomingMessage(req2, res);

  console.log('\nWebhook simulation complete.');
}

run().catch((e) => { console.error('Error running webhook simulation', e); process.exit(1); });
