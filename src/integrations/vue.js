/**
 * Integrazione Vue 3.
 *
 * ```js
 * import { createApp } from 'vue';
 * import { createZipSmsPlugin } from 'zipsms/vue';
 *
 * createApp(App)
 *   .use(createZipSmsPlugin({ apiKey: import.meta.env.VITE_ZIPSMS_API_KEY }))
 *   .mount('#app');
 *
 * // nel setup():
 * import { useZipSms } from 'zipsms/vue';
 * const zipsms = useZipSms();
 * ```
 */

import { inject, provide } from 'vue';
import { resolveClient } from './shared.js';

/** @type {import('vue').InjectionKey<import('../client.js').ZipSmsClient>} */
export const ZIP_SMS_KEY = Symbol('ZipSmsClient');

/**
 * @param {import('../client.js').ZipSmsClient | import('../config.js').Config | import('../config.js').ConfigOptions} configOrClient
 * @param {{ fetch?: import('../http.js').FetchLike }} [options]
 * @returns {{ install(app: import('vue').App): void }}
 */
export function createZipSmsPlugin(configOrClient, options = {}) {
  const client = resolveClient(configOrClient, options);

  return {
    install(app) {
      app.provide(ZIP_SMS_KEY, client);
      app.config.globalProperties.$zipsms = client;
    },
  };
}

/**
 * Fornisce il client nello scope corrente (composition API).
 * @param {import('../client.js').ZipSmsClient | import('../config.js').Config | import('../config.js').ConfigOptions} configOrClient
 * @param {{ fetch?: import('../http.js').FetchLike }} [options]
 * @returns {import('../client.js').ZipSmsClient}
 */
export function provideZipSms(configOrClient, options = {}) {
  const client = resolveClient(configOrClient, options);
  provide(ZIP_SMS_KEY, client);
  return client;
}

/**
 * Restituisce il client fornito dal plugin o da `provideZipSms`.
 * @returns {import('../client.js').ZipSmsClient}
 */
export function useZipSms() {
  const client = inject(ZIP_SMS_KEY);
  if (!client) {
    throw new Error(
      'useZipSms: ZipSMS non installato. Usa createZipSmsPlugin(...) o provideZipSms(...).',
    );
  }
  return client;
}
