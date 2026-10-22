/** Entry-point dell'SDK. */

import { Config, DEFAULT_BASE_URL } from './config.js';
import { HttpClient } from './http.js';
import { App } from './resources/app.js';
import { Devices } from './resources/devices.js';
import { Sms } from './resources/sms.js';
import { Usage } from './resources/usage.js';

/**
 * @typedef {import('./http.js').FetchLike} FetchLike
 */

export class ZipSmsClient {
  #config;
  #http;
  #sms = null;
  #devices = null;
  #usage = null;
  #app = null;

  /**
   * @param {Config} config
   * @param {{ fetch?: FetchLike }} [options]
   */
  constructor(config, options = {}) {
    if (!(config instanceof Config)) {
      throw new TypeError('ZipSmsClient richiede una istanza di Config.');
    }
    this.#config = config;
    this.#http = new HttpClient(config, options);
  }

  /**
   * Scorciatoia: client autenticato con API key.
   * @param {string} apiKey
   * @param {string} [baseUrl]
   * @param {import('./config.js').ConfigOptions & { fetch?: FetchLike }} [options]
   * @returns {ZipSmsClient}
   */
  static create(apiKey, baseUrl = DEFAULT_BASE_URL, options = {}) {
    Config.assertCredential(apiKey, 'API key');
    const { fetch, ...configOptions } = options;

    return new ZipSmsClient(
      Config.create({ ...configOptions, baseUrl, apiKey }),
      { fetch },
    );
  }

  /**
   * Client con sessione Bearer (dashboard: devices/usage/invio manuale).
   * @param {string} bearerToken
   * @param {string} [baseUrl]
   * @param {import('./config.js').ConfigOptions & { fetch?: FetchLike }} [options]
   * @returns {ZipSmsClient}
   */
  static withSession(bearerToken, baseUrl = DEFAULT_BASE_URL, options = {}) {
    Config.assertCredential(bearerToken, 'Bearer token');
    const { fetch, ...configOptions } = options;

    return new ZipSmsClient(
      Config.create({ ...configOptions, baseUrl, bearerToken }),
      { fetch },
    );
  }

  /** @returns {Sms} */
  sms() {
    this.#sms ??= new Sms(this.#http);
    return this.#sms;
  }

  /** @returns {Devices} */
  devices() {
    this.#devices ??= new Devices(this.#http);
    return this.#devices;
  }

  /** @returns {Usage} */
  usage() {
    this.#usage ??= new Usage(this.#http);
    return this.#usage;
  }

  /** @returns {App} */
  app() {
    this.#app ??= new App(this.#http);
    return this.#app;
  }

  /** @returns {Config} */
  get config() {
    return this.#config;
  }

  /**
   * Rappresentazione sicura: Config redige le credenziali.
   * @returns {string}
   */
  toString() {
    return `ZipSmsClient(config=${JSON.stringify(this.#config)})`;
  }
}

/** Alias per chi preferisce la grafia del brand. */
export const ZipSMSClient = ZipSmsClient;
