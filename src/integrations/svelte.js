/**
 * Integrazione Svelte 4/5 (context API + store).
 *
 * In un componente padre:
 * ```svelte
 * <script>
 *   import { setZipSms } from 'zipsms/svelte';
 *   const zipsms = setZipSms({ apiKey: import.meta.env.VITE_ZIPSMS_API_KEY });
 * </script>
 * ```
 *
 * In un componente figlio:
 * ```svelte
 * <script>
 *   import { getZipSms } from 'zipsms/svelte';
 *   const zipsms = getZipSms();
 * </script>
 * ```
 */

import { getContext, setContext } from 'svelte';
import { get, writable } from 'svelte/store';
import { resolveClient } from './shared.js';

const ZIP_SMS_KEY = Symbol('ZipSmsClient');

/**
 * Crea e fornisce il client nel contesto Svelte corrente.
 * @param {import('../client.js').ZipSmsClient | import('../config.js').Config | import('../config.js').ConfigOptions} configOrClient
 * @param {{ fetch?: import('../http.js').FetchLike }} [options]
 * @returns {import('svelte/store').Writable<import('../client.js').ZipSmsClient>}
 */
export function setZipSms(configOrClient, options = {}) {
  const store = writable(resolveClient(configOrClient, options));
  setContext(ZIP_SMS_KEY, store);
  return store;
}

/**
 * Restituisce lo store del client dal contesto Svelte.
 * @returns {import('svelte/store').Writable<import('../client.js').ZipSmsClient>}
 */
export function useZipSms() {
  const store = getContext(ZIP_SMS_KEY);
  if (!store) {
    throw new Error(
      'useZipSms: ZipSMS non impostato. Chiama setZipSms(...) in un componente padre.',
    );
  }
  return store;
}

/**
 * Scorciatoia: restituisce il client corrente (non reattivo).
 * @returns {import('../client.js').ZipSmsClient}
 */
export function getZipSms() {
  return get(useZipSms());
}
