/**
 * Wrapper HTTP basato su Fetch API (Node 18+, browser, React Native).
 *
 * Non logga mai le credenziali; i messaggi di errore espongono solo
 * `message`/`code` del body, senza header sensibili.
 */

import { Config } from './config.js';
import {
  AuthenticationException,
  ConflictException,
  NetworkException,
  NotFoundException,
  RateLimitException,
  ServerException,
  ValidationException,
  ZipSmsException,
} from './errors.js';
import { VERSION } from './version.js';

/**
 * @typedef {(input: string | URL, init?: RequestInit) => Promise<Response>} FetchLike
 */

export class HttpClient {
  static SDK_VERSION = VERSION;

  #config;
  #fetch;

  /**
   * @param {Config} config
   * @param {{ fetch?: FetchLike }} [options]
   */
  constructor(config, { fetch: fetchImplementation = globalThis.fetch } = {}) {
    if (!(config instanceof Config)) {
      throw new TypeError('HttpClient richiede una istanza di Config.');
    }
    if (typeof fetchImplementation !== 'function') {
      throw new Error(
        'Fetch API non disponibile. Usa Node 18+ oppure passa { fetch } nelle opzioni.',
      );
    }
    this.#config = config;
    this.#fetch = fetchImplementation;
  }

  /**
   * Esegue una richiesta e restituisce il body JSON decodificato.
   * Per risposte 204/vuote restituisce `{}`.
   *
   * @param {string} method
   * @param {string} path
   * @param {{
   *   json?: unknown,
   *   query?: Record<string, unknown>,
   *   headers?: HeadersInit,
   *   timeout?: number,
   *   signal?: AbortSignal,
   * } & Record<string, unknown>} [options]
   * @returns {Promise<Record<string, unknown> | unknown[]>}
   */
  async request(method, path, options = {}) {
    const {
      json,
      query,
      headers,
      timeout,
      signal,
      ...fetchOptions
    } = options;

    const requestHeaders = new Headers(headers);
    if (!requestHeaders.has('Accept')) {
      requestHeaders.set('Accept', 'application/json');
    }
    if (!requestHeaders.has('User-Agent')) {
      // Nei browser è un header forbidden: il browser lo ignora senza errori.
      requestHeaders.set('User-Agent', `zipsms-js-sdk/${HttpClient.SDK_VERSION}`);
    }
    if (this.#config.apiKey !== null && !requestHeaders.has('x-api-key')) {
      requestHeaders.set('x-api-key', this.#config.apiKey);
    }
    if (this.#config.bearerToken !== null && !requestHeaders.has('Authorization')) {
      requestHeaders.set('Authorization', `Bearer ${this.#config.bearerToken}`);
    }

    const url = new URL(
      `${this.#config.baseUrl}/${String(path).replace(/^\/+/, '')}`,
    );
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, String(value));
        }
      }
    }

    let body;
    if (json !== undefined) {
      body = JSON.stringify(json);
      if (!requestHeaders.has('Content-Type')) {
        requestHeaders.set('Content-Type', 'application/json');
      }
    }

    const requestedTimeout = timeout === undefined ? this.#config.timeout : Number(timeout);
    const timeoutSeconds =
      Number.isFinite(requestedTimeout) && requestedTimeout > 0
        ? requestedTimeout
        : this.#config.timeout;
    const connectTimeoutSeconds = this.#config.connectTimeout;

    const controller = new AbortController();
    /** @type {string | null} */
    let abortMessage = null;
    let responseReceived = false;

    const totalTimer = setTimeout(() => {
      abortMessage = `Timeout della richiesta dopo ${timeoutSeconds}s.`;
      controller.abort();
    }, timeoutSeconds * 1000);

    const connectTimer = setTimeout(() => {
      if (!responseReceived) {
        abortMessage = `Timeout di connessione dopo ${connectTimeoutSeconds}s.`;
        controller.abort();
      }
    }, connectTimeoutSeconds * 1000);

    /** @type {(() => void) | undefined} */
    let onExternalAbort;
    if (signal) {
      if (signal.aborted) {
        controller.abort(signal.reason);
      } else {
        onExternalAbort = () => controller.abort(signal.reason);
        signal.addEventListener('abort', onExternalAbort, { once: true });
      }
    }

    try {
      let response;
      try {
        response = await this.#fetch(url.toString(), {
          ...fetchOptions,
          method: String(method).toUpperCase(),
          headers: requestHeaders,
          body,
          signal: controller.signal,
        });
        responseReceived = true;
        clearTimeout(connectTimer);
      } catch (error) {
        if (controller.signal.aborted) {
          throw new NetworkException(abortMessage ?? 'Richiesta annullata.', {
            cause: error,
          });
        }
        throw new NetworkException(
          `Errore di rete: ${HttpClient.#safeReason(error)}`,
          { cause: error },
        );
      }

      let text;
      try {
        text = await response.text();
      } catch (error) {
        if (controller.signal.aborted) {
          throw new NetworkException(abortMessage ?? 'Richiesta annullata.', {
            cause: error,
          });
        }
        throw new NetworkException(
          `Impossibile leggere la risposta: ${HttpClient.#safeReason(error)}`,
          { cause: error },
        );
      }

      const status = response.status;
      if (status === 204 || text.trim() === '') {
        if (status >= 200 && status < 300) {
          return {};
        }
        throw HttpClient.#mapError(status, null, response.headers.get('Retry-After') || '');
      }

      let decoded;
      try {
        decoded = JSON.parse(text);
      } catch (error) {
        throw new ServerException(`Risposta non-JSON dal server (HTTP ${status}).`, {
          statusCode: status,
          cause: error,
        });
      }

      if (status >= 200 && status < 300) {
        if (Array.isArray(decoded) || (decoded !== null && typeof decoded === 'object')) {
          return decoded;
        }
        return { data: decoded };
      }

      const payload =
        decoded !== null && typeof decoded === 'object' && !Array.isArray(decoded)
          ? decoded
          : null;
      throw HttpClient.#mapError(
        status,
        payload,
        response.headers.get('Retry-After') || '',
      );
    } finally {
      clearTimeout(totalTimer);
      clearTimeout(connectTimer);
      if (signal && onExternalAbort) {
        signal.removeEventListener('abort', onExternalAbort);
      }
    }
  }

  /**
   * @param {unknown} error
   * @returns {string}
   */
  static #safeReason(error) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : String(error);
    return message.slice(0, 300);
  }

  /**
   * @param {number} status
   * @param {Record<string, unknown> | null} payload
   * @param {string} retryAfter
   * @returns {ZipSmsException}
   */
  static #mapError(status, payload, retryAfter) {
    const message = HttpClient.#extractMessage(payload, status);
    const errorCode = HttpClient.#extractCode(payload);

    if (status === 400 || status === 422) {
      return new ValidationException(message, { errorCode, statusCode: status });
    }
    if (status === 401 || status === 403) {
      return new AuthenticationException(message, { errorCode, statusCode: status });
    }
    if (status === 404) {
      return new NotFoundException(message, { errorCode, statusCode: status });
    }
    if (status === 409) {
      return new ConflictException(message, { errorCode, statusCode: status });
    }
    if (status === 429) {
      return new RateLimitException(message, {
        errorCode,
        statusCode: status,
        retryAfterSeconds: HttpClient.#parseRetryAfter(retryAfter),
      });
    }
    if (status >= 500) {
      return new ServerException(message, { errorCode, statusCode: status });
    }
    return new ZipSmsException(message, { errorCode, statusCode: status });
  }

  /**
   * @param {Record<string, unknown> | null} payload
   * @param {number} status
   * @returns {string}
   */
  static #extractMessage(payload, status) {
    if (payload) {
      for (const key of ['message', 'error', 'detail']) {
        const value = payload[key];
        if (typeof value === 'string' && value.trim() !== '') {
          return value.trim().slice(0, 500);
        }
      }

      const first = HttpClient.#firstString(payload.errors);
      if (first !== null) {
        return first.slice(0, 500);
      }
    }
    return `Richiesta fallita (HTTP ${status}).`;
  }

  /**
   * @param {Record<string, unknown> | null} payload
   * @returns {string | null}
   */
  static #extractCode(payload) {
    if (payload && typeof payload.code === 'string') {
      const value = payload.code.trim();
      if (/^[A-Z0-9_]{1,64}$/.test(value)) {
        return value;
      }
    }
    return null;
  }

  /**
   * @param {unknown} value
   * @returns {string | null}
   */
  static #firstString(value) {
    if (typeof value === 'string') {
      return value.trim() === '' ? null : value.trim();
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = HttpClient.#firstString(item);
        if (found !== null) {
          return found;
        }
      }
      return null;
    }
    if (value !== null && typeof value === 'object') {
      for (const item of Object.values(value)) {
        const found = HttpClient.#firstString(item);
        if (found !== null) {
          return found;
        }
      }
    }
    return null;
  }

  /**
   * @param {string} header
   * @returns {number | null}
   */
  static #parseRetryAfter(header) {
    const value = header.trim();
    if (value === '') {
      return null;
    }
    if (/^\d+$/.test(value)) {
      return Number(value);
    }

    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      return null;
    }
    return Math.max(0, Math.floor((timestamp - Date.now()) / 1000));
  }
}
