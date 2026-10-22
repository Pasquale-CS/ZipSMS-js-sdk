/**
 * Configurazione immutabile del client.
 *
 * Sicurezza:
 * - `baseUrl` deve essere HTTPS, tranne host locali (localhost, 127.0.0.1,
 *   ::1, *.localhost, *.local, *.test) utili per sviluppo/test.
 * - Le credenziali vengono trimmate e validate (niente whitespace, niente
 *   caratteri di controllo → previene header injection).
 * - Le credenziali sono campi privati: non compaiono in console.log/JSON.
 */

import { byteLength, isPlainObject } from './utils.js';
import { ValidationException } from './errors.js';

export const DEFAULT_BASE_URL = 'https://zipsms-gateway.pcs.website';
export const DEFAULT_TIMEOUT = 15;
export const DEFAULT_CONNECT_TIMEOUT = 5;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const LOCAL_SUFFIXES = ['.localhost', '.local', '.test', '.example', '.invalid'];
const CREDENTIAL_FORBIDDEN = /[\s\x00-\x1F\x7F]/;

/**
 * @typedef {object} ConfigOptions
 * @property {string} [baseUrl]
 * @property {string | null} [apiKey]
 * @property {string | null} [bearerToken]
 * @property {string | null} [sessionToken]
 * @property {number} [timeout]
 * @property {number} [connectTimeout]
 */

export class Config {
  #baseUrl;
  #apiKey;
  #bearerToken;
  #timeout;
  #connectTimeout;

  /**
   * @param {ConfigOptions} [options]
   */
  constructor({
    baseUrl = DEFAULT_BASE_URL,
    apiKey = null,
    bearerToken = null,
    timeout = DEFAULT_TIMEOUT,
    connectTimeout = DEFAULT_CONNECT_TIMEOUT,
  } = {}) {
    if (typeof baseUrl !== 'string') {
      throw new ValidationException(
        'baseUrl non valido: serve un URL assoluto (es. https://api.zipsms.it).',
      );
    }

    const normalizedUrl = baseUrl.trim().replace(/\/+$/, '');
    Config.#assertValidBaseUrl(normalizedUrl);

    this.#baseUrl = normalizedUrl;
    this.#timeout = Config.#coerceTimeout(timeout, 'timeout');
    this.#connectTimeout = Config.#coerceTimeout(connectTimeout, 'connectTimeout');

    if (apiKey !== null && apiKey !== undefined) {
      Config.assertCredential(apiKey, 'API key');
      this.#apiKey = apiKey;
    } else {
      this.#apiKey = null;
    }

    if (bearerToken !== null && bearerToken !== undefined) {
      Config.assertCredential(bearerToken, 'Bearer token');
      this.#bearerToken = bearerToken;
    } else {
      this.#bearerToken = null;
    }

    Object.freeze(this);
  }

  get baseUrl() {
    return this.#baseUrl;
  }

  get apiKey() {
    return this.#apiKey;
  }

  get bearerToken() {
    return this.#bearerToken;
  }

  get timeout() {
    return this.#timeout;
  }

  get connectTimeout() {
    return this.#connectTimeout;
  }

  /**
   * Crea una config accettando chiavi camelCase e snake_case.
   * Le chiavi sconosciute vengono ignorate.
   * @param {Record<string, unknown> | Config} [values]
   * @returns {Config}
   */
  static create(values = {}) {
    if (values instanceof Config) {
      return values;
    }
    if (!isPlainObject(values)) {
      throw new ValidationException('Config non valida: serve un oggetto di configurazione.');
    }

    /** @param {...string} keys */
    const pick = (...keys) => {
      for (const key of keys) {
        const value = values[key];
        if (value !== undefined && value !== null) {
          return value;
        }
      }
      return undefined;
    };

    const baseUrl = pick('baseUrl', 'base_url');
    const timeout = pick('timeout');
    const connectTimeout = pick('connectTimeout', 'connect_timeout');
    const apiKey = pick('apiKey', 'api_key');
    const bearerToken = pick('bearerToken', 'bearer_token', 'sessionToken', 'session_token');

    return new Config({
      baseUrl: baseUrl === undefined ? DEFAULT_BASE_URL : baseUrl,
      timeout: timeout === undefined ? DEFAULT_TIMEOUT : timeout,
      connectTimeout:
        connectTimeout === undefined ? DEFAULT_CONNECT_TIMEOUT : connectTimeout,
      apiKey: apiKey === undefined ? null : apiKey,
      bearerToken: bearerToken === undefined ? null : bearerToken,
    });
  }

  /**
   * @param {string} apiKey
   * @returns {Config}
   */
  withApiKey(apiKey) {
    return new Config({
      baseUrl: this.#baseUrl,
      apiKey,
      bearerToken: this.#bearerToken,
      timeout: this.#timeout,
      connectTimeout: this.#connectTimeout,
    });
  }

  /**
   * @param {string} bearerToken
   * @returns {Config}
   */
  withBearerToken(bearerToken) {
    return new Config({
      baseUrl: this.#baseUrl,
      apiKey: this.#apiKey,
      bearerToken,
      timeout: this.#timeout,
      connectTimeout: this.#connectTimeout,
    });
  }

  /**
   * Rappresentazione sicura: non espone mai le credenziali.
   * @returns {object}
   */
  toJSON() {
    return {
      baseUrl: this.#baseUrl,
      apiKey: this.#apiKey === null ? null : '***',
      bearerToken: this.#bearerToken === null ? null : '***',
      timeout: this.#timeout,
      connectTimeout: this.#connectTimeout,
    };
  }

  /**
   * Rigetta credenziali vuote, con whitespace o caratteri di controllo.
   * @param {string} value
   * @param {string} label
   * @returns {void}
   */
  static assertCredential(value, label) {
    if (typeof value !== 'string') {
      throw new ValidationException(
        `${label} non valida: non deve essere vuota né contenere spazi ai bordi.`,
      );
    }

    const trimmed = value.trim();
    if (trimmed === '' || trimmed !== value) {
      throw new ValidationException(
        `${label} non valida: non deve essere vuota né contenere spazi ai bordi.`,
      );
    }
    if (byteLength(trimmed) < 8) {
      throw new ValidationException(`${label} non valida: valore troppo corto.`);
    }
    if (CREDENTIAL_FORBIDDEN.test(trimmed)) {
      throw new ValidationException(`${label} non valida: contiene caratteri non consentiti.`);
    }
  }

  /**
   * @param {string} url
   * @returns {void}
   */
  static #assertValidBaseUrl(url) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (error) {
      throw new ValidationException(
        'baseUrl non valido: serve un URL assoluto (es. https://api.zipsms.it).',
        { cause: error },
      );
    }

    let host = parsed.hostname.toLowerCase();
    if (host.startsWith('[') && host.endsWith(']')) {
      host = host.slice(1, -1);
    }

    if (!host) {
      throw new ValidationException(
        'baseUrl non valido: serve un URL assoluto (es. https://api.zipsms.it).',
      );
    }

    if (parsed.username !== '' || parsed.password !== '') {
      throw new ValidationException(
        'baseUrl non valido: non includere credenziali nell\'URL.',
      );
    }

    if (parsed.search !== '' || parsed.hash !== '') {
      throw new ValidationException(
        'baseUrl non valido: niente query string o fragment nell\'URL.',
      );
    }

    const protocol = parsed.protocol.replace(/:$/, '').toLowerCase();
    if (protocol !== 'http' && protocol !== 'https') {
      throw new ValidationException('baseUrl non valido: schema consentiti http/https.');
    }

    if (protocol === 'http' && !Config.#isLocalHost(host)) {
      throw new ValidationException(
        'baseUrl non sicuro: è richiesto HTTPS '
          + '(http consentito solo per localhost/127.0.0.1/*.local/*.test).',
      );
    }
  }

  /**
   * @param {string} host
   * @returns {boolean}
   */
  static #isLocalHost(host) {
    return LOCAL_HOSTS.has(host) || LOCAL_SUFFIXES.some((suffix) => host.endsWith(suffix));
  }

  /**
   * @param {unknown} value
   * @param {string} name
   * @returns {number}
   */
  static #coerceTimeout(value, name) {
    const timeout = Number(value);
    if (!Number.isFinite(timeout) || timeout < 1 || timeout > 120) {
      throw new ValidationException(`${name} deve essere tra 1 e 120 secondi.`);
    }
    return timeout;
  }
}
