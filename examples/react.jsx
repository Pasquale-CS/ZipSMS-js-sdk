/** Esempio React.
 *
 * Vite: `VITE_ZIPSMS_API_KEY` in `.env`.
 * In produzione non esporre l'API key al browser: chiama l'SDK da un backend.
 */

import React from 'react';
import { ZipSmsProvider, useZipSms } from '../src/integrations/react.js';

export function App() {
  return (
    <ZipSmsProvider apiKey={import.meta.env.VITE_ZIPSMS_API_KEY}>
      <OrderButton />
    </ZipSmsProvider>
  );
}

function OrderButton() {
  const zipsms = useZipSms();

  async function notify() {
    await zipsms.sms().send({
      to: '+393331234567',
      message: 'Il tuo ordine è pronto!',
      deviceName: 'ufficio-1',
      reference: 'ordine-123',
      idempotencyKey: 'ordine-123',
    });
  }

  return <button onClick={notify}>Invia SMS</button>;
}
