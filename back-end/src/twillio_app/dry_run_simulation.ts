import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import { WhatsAppAgentService } from './whatsapp-agent.service';

async function simulate() {
  const agent = new WhatsAppAgentService();

  const contactName = 'Test User';
  const phone = '+33123456789';
  const context = 'Test context for dry-run simulation';

  console.log('\n=== Dry-run simulation: NO RESPONSE path (fast timeout 3s) ===');
  const first = await agent.generateFirstMessage(contactName, context);
  console.log('First message:', first);

  // schedule "follow-up" in 3s for test
  setTimeout(async () => {
    console.log('\n[Timer fired] Generating second message...');
    const second = await agent.generateSecondMessage(contactName, first, context);
    console.log('Second message:', second);
  }, 3000);

  console.log('\nWaiting 4s to allow timer to fire...');
  await new Promise((r) => setTimeout(r, 4000));

  console.log('\n=== Dry-run simulation: RESPONSE-before-timeout path ===');
  const first2 = await agent.generateFirstMessage(contactName, context);
  console.log('First message:', first2);

  let cancelled = false;
  const timer = setTimeout(async () => {
    if (!cancelled) {
      console.log('\n[Timer fired] Should send second message (but in this scenario it should be cancelled)');
      const s = await agent.generateSecondMessage(contactName, first2, context);
      console.log('Second message:', s);
    }
  }, 3000);

  // Simulate incoming response after 1s
  await new Promise((r) => setTimeout(r, 1000));
  cancelled = true;
  clearTimeout(timer);
  console.log('[Simulated incoming reply] Timer cancelled. No second message will be sent.');

  console.log('\nDry-run simulation complete.');
}

simulate().catch((err) => {
  console.error('Simulation error:', err);
  process.exit(1);
});
