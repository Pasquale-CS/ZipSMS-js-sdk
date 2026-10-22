/**
 * Invio e consultazione SMS.
 *
 * Auth:
 * - `send`/`get`/`list` → API key (`x-api-key`) oppure sessione Bearer.
 * - `sendFromDashboard` → solo sessione Bearer (dashboard manuale).
 */

import { HttpClient } from '../http.js';
import { Validator } from '../validation.js';
import { ValidationException } from '../errors.js';
import { isPlainObject, sleep } from '../utils.js';

const TERMINAL_STATUSES = new Set(['SENT', 'DELIVERED', 'FAILED']);
const STRING_FILTERS = {
  status: 'status',
  deviceId: 'deviceId',
  device_id: 'deviceId',
  source: 'source',
  from: 'from',
  from_: 'from',
  to: 'to',
};

/**
 * @param {unknown} value
 * @param {string} name
 * @returns {number}
 */
function toInteger(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new ValidationException(`${name} non valido: richiesto un numero intero.`);
  }
  return Math.trunc(number);
}

export class Sms {
  #http;

  /** @param {HttpClient} http */
  constructor(http) {
    this.#http = http;
  }

  /**
   * Accoda un SMS (R1). Idempotente via `Idempotency-Key`.
   *
   * Target: esattamente uno tra `deviceId` e `deviceName`.
   *
   * Forma consigliata:
   * `send({ to, message, deviceId?|deviceName?, reference?, idempotencyKey? })`.
   * È supportata anche la forma posizionale
   * `send(to, message, { deviceId?, deviceName?, reference?, idempotencyKey? })`.
   *
   * @param {string | Record<string, unknown>} toOrParams
   * @param {string} [message]
   * @param {Record<string, unknown>} [options]
   * @returns {Promise<Record<string, unknown>>}
   */
  async send(toOrParams, message, options = {}) {
    const params = isPlainObject(toOrParams)
      ? toOrParams
      : { ...options, to: toOrParams, message };

    const payload = {
      ...Validator.deviceTarget(params.deviceId, params.deviceName),
      to: Validator.phone(params.to),
      message: Validator.message(params.message),
    };
    const reference = Validator.reference(params.reference);
    if (reference !== null) {
      payload.reference = reference;
    }

    return this.#http.request('POST', '/api/v1/sms/send', {
      json: payload,
      headers: {
        'Idempotency-Key': Validator.idempotencyKey(params.idempotencyKey),
      },
    });
  }

  /**
   * Invia e attende l'esito finale via polling.
   *
   * @param {string | Record<string, unknown>} toOrParams
   * @param {string} [message]
   * @param {Record<string, unknown>} [options]
   * @returns {Promise<Record<string, unknown>>}
   */
  async sendAndWait(toOrParams, message, options = {}) {
    const params = isPlainObject(toOrParams)
      ? toOrParams
      : { ...options, to: toOrParams, message };

    const sent = await this.send(params);
    const smsId = sent && typeof sent === 'object' ? sent.id : undefined;
    if (typeof smsId !== 'string' || smsId === '') {
      return sent;
    }

    const timeoutSeconds = Number(params.timeoutSeconds ?? 120);
    const pollIntervalSeconds = Number(params.pollIntervalSeconds ?? 3);
    const deadline = Date.now() + Math.max(5, timeoutSeconds) * 1000;

    for (;;) {
      await sleep(Math.max(1, pollIntervalSeconds) * 1000);
      const current = await this.get(smsId);
      const status = String(current?.status ?? '').toUpperCase();
      if (TERMINAL_STATUSES.has(status)) {
        return current;
      }
      if (Date.now() >= deadline) {
        return current;
      }
    }
  }

  /**
   * Dettaglio + stato di un SMS (polling).
   * @param {string} smsId
   * @returns {Promise<Record<string, unknown>>}
   */
  async get(smsId) {
    const segment = encodeURIComponent(Validator.smsId(smsId));
    return this.#http.request('GET', `/api/v1/sms/${segment}`);
  }

  /**
   * Elenca i propri SMS. Accetta sia chiavi API (`deviceId`, `from`) sia
   * alias JavaScript (`device_id`, `from_`).
   *
   * @param {Record<string, unknown>} [filters]
   * @returns {Promise<Record<string, unknown>>}
   */
  async list(filters = {}) {
    if (!isPlainObject(filters)) {
      throw new ValidationException('Filtri SMS non validi: serve un oggetto.');
    }

    /** @type {Record<string, string | number>} */
    const query = {};
    for (const [key, value] of Object.entries(filters)) {
      const apiKey = STRING_FILTERS[key];
      if (apiKey) {
        if (typeof value === 'string' && value.trim() !== '') {
          query[apiKey] = value.trim();
        }
        continue;
      }

      if (key === 'page' && value !== undefined && value !== null) {
        query.page = Math.max(1, toInteger(value, 'page'));
      } else if (key === 'limit' && value !== undefined && value !== null) {
        query.limit = Math.min(100, Math.max(1, toInteger(value, 'limit')));
      }
    }

    return this.#http.request('GET', '/api/v1/sms', { query });
  }

  /**
   * Invio manuale multi-device dalla dashboard (auth: Bearer).
   *
   * Forma consigliata:
   * `sendFromDashboard({ deviceIds, to, message, reference? })`.
   *
   * @param {string[] | Record<string, unknown>} deviceIdsOrParams
   * @param {string} [to]
   * @param {string} [message]
   * @param {string} [reference]
   * @returns {Promise<Record<string, unknown>>}
   */
  async sendFromDashboard(deviceIdsOrParams, to, message, reference) {
    const params = Array.isArray(deviceIdsOrParams)
      ? { deviceIds: deviceIdsOrParams, to, message, reference }
      : deviceIdsOrParams;

    /** @type {Record<string, unknown>} */
    const payload = {
      deviceIds: Validator.deviceIds(params.deviceIds),
      to: Validator.phone(params.to),
      message: Validator.message(params.message),
    };
    const normalizedReference = Validator.reference(params.reference);
    if (normalizedReference !== null) {
      payload.reference = normalizedReference;
    }

    return this.#http.request('POST', '/api/v1/sms/send-from-dashboard', {
      json: payload,
    });
  }
}
