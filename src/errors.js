/**
 * Eccezioni tipizzate dell'SDK.
 *
 * Tutte ereditano da {@link ZipSmsException}. Il messaggio non contiene mai
 * credenziali: API key e token viaggiano solo negli header HTTP.
 */

/**
 * @typedef {object} ZipSmsErrorOptions
 * @property {string | null} [errorCode] Codice applicativo del gateway.
 * @property {number} [statusCode] Status HTTP (0 per errori locali/rete).
 * @property {unknown} [cause] Errore originale.
 */

export class ZipSmsException extends Error {
  /**
   * @param {string} message
   * @param {ZipSmsErrorOptions} [options]
   */
  constructor(message, { errorCode = null, statusCode = 0, cause } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = new.target.name;
    /** @type {string | null} */
    this.errorCode = errorCode;
    /** @type {number} */
    this.statusCode = statusCode;
  }
}

export class ValidationException extends ZipSmsException {}

export class AuthenticationException extends ZipSmsException {}

export class NotFoundException extends ZipSmsException {}

export class ConflictException extends ZipSmsException {}

export class ServerException extends ZipSmsException {}

export class NetworkException extends ZipSmsException {}

export class RateLimitException extends ZipSmsException {
  /**
   * @param {string} message
   * @param {ZipSmsErrorOptions & { retryAfterSeconds?: number | null }} [options]
   */
  constructor(message, { retryAfterSeconds = null, ...options } = {}) {
    super(message, options);
    /** @type {number | null} */
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
