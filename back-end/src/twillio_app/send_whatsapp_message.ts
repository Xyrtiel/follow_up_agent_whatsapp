import path from 'path';
import dotenv from 'dotenv';
// Charge le .env qui est à la racine du dépôt, si présent
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import twilio from 'twilio';
const accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
const authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
const fromEnv = (process.env.TWILIO_WHATSAPP_NUMBER || '').trim();
const targetEnv = (process.env.TARGET_PHONE_NUMBER || '').trim();

// Vérifications explicites pour des erreurs plus claires
if (!accountSid || !authToken) {
  throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set in environment variables (or in the root .env).');
}
if (!fromEnv || !targetEnv) {
  throw new Error('TWILIO_WHATSAPP_NUMBER and TARGET_PHONE_NUMBER must be set in environment variables (or in the root .env).');
}

const client = twilio(accountSid, authToken);
export async function sendWhatsAppMessage() {
    const from = fromEnv.startsWith('whatsapp:') ? fromEnv : `whatsapp:${fromEnv}`;
    const to = targetEnv.startsWith('whatsapp:') ? targetEnv : `whatsapp:${targetEnv}`;
    try {
        const message = await client.messages.create({
            body: 'Message de test depuis Twilio',
            from,
            to,
        });
        console.log(`Message sent to ${to}: ${message.sid}`);
    } catch (error) {
        console.error(error.message, { status: error.status, code: error.code, moreInfo: error.moreInfo });
        console.error(`Failed to send message to ${to}:`, error);
    }
}

sendWhatsAppMessage();