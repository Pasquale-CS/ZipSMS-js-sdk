/**
 * Integrazione Angular 16+ (standalone API / environment providers).
 *
 * ```ts
 * import { bootstrapApplication } from '@angular/platform-browser';
 * import { provideZipSms } from 'zipsms/angular';
 *
 * bootstrapApplication(AppComponent, {
 *   providers: [provideZipSms({ apiKey: environment.zipsmsApiKey })],
 * });
 *
 * // In un componente/servizio:
 * import { injectZipSms } from 'zipsms/angular';
 * private readonly zipsms = injectZipSms();
 * ```
 */

import { InjectionToken, inject, makeEnvironmentProviders } from '@angular/core';
import { resolveClient } from './shared.js';

/** @type {import('@angular/core').InjectionToken<import('../client.js').ZipSmsClient>} */
export const ZIP_SMS_CLIENT = new InjectionToken('ZIPSMS_CLIENT');

/**
 * Fornisce il client ZipSMS nell'environment injector di Angular.
 * @param {import('../client.js').ZipSmsClient | import('../config.js').Config | import('../config.js').ConfigOptions} configOrClient
 * @param {{ fetch?: import('../http.js').FetchLike }} [options]
 * @returns {import('@angular/core').EnvironmentProviders}
 */
export function provideZipSms(configOrClient, options = {}) {
  return makeEnvironmentProviders([
    {
      provide: ZIP_SMS_CLIENT,
      useFactory: () => resolveClient(configOrClient, options),
    },
  ]);
}

/**
 * Restituisce il client ZipSMS dall'injector Angular.
 * @returns {import('../client.js').ZipSmsClient}
 */
export function injectZipSms() {
  return inject(ZIP_SMS_CLIENT);
}
