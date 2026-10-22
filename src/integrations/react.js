/**
 * Integrazione React (React 18+).
 *
 * ```jsx
 * import { ZipSmsProvider, useZipSms } from 'zipsms/react';
 *
 * <ZipSmsProvider apiKey={import.meta.env.VITE_ZIPSMS_API_KEY}>
 *   <App />
 * </ZipSmsProvider>
 *
 * function App() {
 *   const zipsms = useZipSms();
 *   ...
 * }
 * ```
 */

import { createContext, createElement, useContext, useMemo } from 'react';
import { ZipSmsClient } from '../client.js';
import { resolveClient } from './shared.js';

/** @type {import('react').Context<ZipSmsClient | null>} */
export const ZipSmsContext = createContext(null);

/**
 * @param {{
 *   client?: ZipSmsClient,
 *   config?: ZipSmsClient | import('../config.js').Config | import('../config.js').ConfigOptions,
 *   apiKey?: string,
 *   baseUrl?: string,
 *   options?: import('../config.js').ConfigOptions & { fetch?: import('../http.js').FetchLike },
 *   children?: import('react').ReactNode,
 * }} props
 * @returns {import('react').ReactElement}
 */
export function ZipSmsProvider({
  client,
  config,
  apiKey,
  baseUrl,
  options = {},
  children,
}) {
  const value = useMemo(() => {
    if (client) {
      return client;
    }
    if (config) {
      return resolveClient(config, options);
    }
    if (apiKey) {
      return ZipSmsClient.create(apiKey, baseUrl, options);
    }
    throw new Error(
      'ZipSmsProvider: fornisci almeno una tra le prop client, config, apiKey.',
    );
  }, [client, config, apiKey, baseUrl, options]);

  return createElement(ZipSmsContext.Provider, { value }, children);
}

/**
 * Restituisce il client dal provider React.
 * @returns {ZipSmsClient}
 */
export function useZipSms() {
  const client = useContext(ZipSmsContext);
  if (!client) {
    throw new Error(
      'useZipSms: avvolgi il componente con <ZipSmsProvider> oppure usa ZipSmsContext.Provider.',
    );
  }
  return client;
}
