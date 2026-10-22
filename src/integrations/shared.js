/** Helper condivisi dalle integrazioni framework. */

import { Config } from '../config.js';
import { ZipSmsClient } from '../client.js';

/**
 * Risolve un client da:
 * - istanza `ZipSmsClient`;
 * - istanza `Config`;
 * - oggetto di configurazione (`ConfigOptions`).
 *
 * @param {ZipSmsClient | Config | import('../config.js').ConfigOptions} configOrClient
 * @param {{ fetch?: import('../http.js').FetchLike }} [options]
 * @returns {ZipSmsClient}
 */
export function resolveClient(configOrClient, options = {}) {
  if (configOrClient instanceof ZipSmsClient) {
    return configOrClient;
  }
  if (configOrClient instanceof Config) {
    return new ZipSmsClient(configOrClient, options);
  }
  if (configOrClient !== null && typeof configOrClient === 'object') {
    return new ZipSmsClient(Config.create(configOrClient), options);
  }
  throw new TypeError(
    'ZipSMS: passa un ZipSmsClient, una Config o un oggetto di configurazione.',
  );
}
