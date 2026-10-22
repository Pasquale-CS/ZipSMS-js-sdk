/** Esempio base: invio SMS con API key.
 *
 * Sicurezza: la chiave arriva da env, mai hardcodata.
 *
 * Esecuzione:
 *   export ZIPSMS_API_KEY=sk_live_...
 *   node examples/node.js
 */

import { ZipSmsClient } from '../src/index.js';
import { RateLimitException, ZipSmsException } from '../src/errors.js';

const apiKey = process.env.ZIPSMS_API_KEY;
if (!apiKey) {
  console.error('Imposta ZIPSMS_API_KEY');
  process.exit(1);
}

const zipsms = ZipSmsClient.create(
  apiKey,
  process.env.ZIPSMS_BASE_URL || 'https://zipsms-gateway.pcs.website',
);

try {
  const res = await zipsms.sms().send({
    to: '+393331234567',
    message: 'Ciao da ZipSMS!',
    // Target: esattamente uno tra i due:
    deviceName: 'ufficio-1', // …oppure deviceId: 'tuo-device-id'
    reference: 'ordine-123', // opzionale
    // idempotencyKey: undefined → UUIDv4 auto-generato. Passane uno tuo
    // (es. UUID dell'ordine) per retry sicuri senza doppi invii.
  });

  console.log(`Accodato: ${res.id ?? '?'} (${res.status ?? '?'})`);

  const detail = await zipsms.sms().get(res.id);
  console.log(`Stato: ${detail.status ?? '?'}`);
} catch (error) {
  if (error instanceof RateLimitException) {
    console.error(
      `Quota/rate-limit (${error.errorCode}). Retry tra ${error.retryAfterSeconds}s.`,
    );
  } else if (error instanceof ZipSmsException) {
    console.error(
      `Errore ZipSMS [${error.statusCode}/${error.errorCode}]: ${error.message}`,
    );
  } else {
    console.error(error);
  }
  process.exitCode = 1;
}
