/** Esempio Vue 3 (composition API).
 *
 * Vite: `VITE_ZIPSMS_API_KEY` in `.env`.
 */

import { createApp, defineComponent, h, onMounted } from 'vue';
import { createZipSmsPlugin, useZipSms } from '../src/integrations/vue.js';

const App = defineComponent({
  setup() {
    const zipsms = useZipSms();

    onMounted(async () => {
      await zipsms.sms().send({
        to: '+393331234567',
        message: 'Ciao da ZipSMS!',
        deviceName: 'ufficio-1',
        reference: 'ordine-123',
        idempotencyKey: 'ordine-123',
      });
    });

    return () => h('div', 'ZipSMS pronto');
  },
});

createApp(App)
  .use(
    createZipSmsPlugin({
      apiKey: import.meta.env.VITE_ZIPSMS_API_KEY,
    }),
  )
  .mount('#app');
