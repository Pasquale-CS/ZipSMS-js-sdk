<!-- Esempio Svelte 4/5. -->
<script>
  import { setZipSms, getZipSms } from '../src/integrations/svelte.js';

  // Nel componente padre:
  const zipsms = setZipSms({
    apiKey: import.meta.env.VITE_ZIPSMS_API_KEY,
  });

  // In un componente figlio si può usare:
  // const zipsms = getZipSms();

  async function notify() {
    await $zipsms.sms().send({
      to: '+393331234567',
      message: 'Ciao da ZipSMS!',
      deviceName: 'ufficio-1',
      reference: 'ordine-123',
      idempotencyKey: 'ordine-123',
    });
  }
</script>

<button on:click={notify}>Invia SMS</button>
