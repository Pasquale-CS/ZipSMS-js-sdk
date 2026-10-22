/**
 * Gestione device (auth: sessione Bearer).
 *
 * Il `deviceToken` emesso alla creazione va conservato cifrato lato server.
 */

import { HttpClient } from '../http.js';
import { Validator } from '../validation.js';
import { isPlainObject } from '../utils.js';

const EXTRA_ALIASES = {
  device_id: 'deviceId',
  android_version: 'androidVersion',
  app_version: 'appVersion',
};
const EXTRA_FIELDS = new Set(['deviceId', 'androidVersion', 'appVersion']);

/**
 * @param {string} value
 * @returns {string}
 */
function truncate(value) {
  return Array.from(value.trim()).slice(0, 128).join('');
}

export class Devices {
  #http;

  /** @param {HttpClient} http */
  constructor(http) {
    this.#http = http;
  }

  /**
   * Crea un device (emette `deviceToken` una sola volta).
   *
   * Forma consigliata:
   * `create({ name, fcmToken, deviceId?, androidVersion?, appVersion? })`.
   * È supportata anche la forma posizionale `create(name, fcmToken, extra)`.
   *
   * @param {string | Record<string, unknown>} nameOrParams
   * @param {string} [fcmToken]
   * @param {Record<string, unknown>} [extra]
   * @returns {Promise<Record<string, unknown>>}
   */
  async create(nameOrParams, fcmToken, extra = {}) {
    const params = isPlainObject(nameOrParams)
      ? nameOrParams
      : { ...extra, name: nameOrParams, fcmToken };

    /** @type {Record<string, unknown>} */
    const payload = {
      name: Validator.deviceName(params.name),
      fcmToken: Validator.fcmToken(params.fcmToken),
    };

    for (const [key, value] of Object.entries(params)) {
      const apiKey = EXTRA_ALIASES[key] || key;
      if (!EXTRA_FIELDS.has(apiKey)) {
        continue;
      }
      if (typeof value === 'string' && value.trim() !== '') {
        payload[apiKey] = truncate(value);
      }
    }

    return this.#http.request('POST', '/api/v1/devices', { json: payload });
  }

  /**
   * Elenca i propri device (con stato online).
   * @returns {Promise<Record<string, unknown>>}
   */
  async list() {
    return this.#http.request('GET', '/api/v1/devices');
  }

  /**
   * Riprende un device dopo reinstallazione.
   * @param {string | { deviceId: string, fcmToken: string }} deviceIdOrParams
   * @param {string} [fcmToken]
   * @returns {Promise<Record<string, unknown>>}
   */
  async resume(deviceIdOrParams, fcmToken) {
    const params = isPlainObject(deviceIdOrParams)
      ? deviceIdOrParams
      : { deviceId: deviceIdOrParams, fcmToken };

    return this.#http.request('POST', '/api/v1/devices/resume', {
      json: {
        deviceId: Validator.deviceId(params.deviceId),
        fcmToken: Validator.fcmToken(params.fcmToken),
      },
    });
  }

  /**
   * Collega un device orfano al proprio account.
   * @param {string} deviceId
   * @returns {Promise<Record<string, unknown>>}
   */
  async claim(deviceId) {
    const segment = encodeURIComponent(Validator.deviceId(deviceId));
    return this.#http.request('POST', `/api/v1/devices/${segment}/claim`);
  }

  /**
   * Rinomina un device.
   * @param {string | { deviceId: string, name: string }} deviceIdOrParams
   * @param {string} [name]
   * @returns {Promise<Record<string, unknown>>}
   */
  async rename(deviceIdOrParams, name) {
    const params = isPlainObject(deviceIdOrParams)
      ? deviceIdOrParams
      : { deviceId: deviceIdOrParams, name };
    const segment = encodeURIComponent(Validator.deviceId(params.deviceId));

    return this.#http.request('PATCH', `/api/v1/devices/${segment}`, {
      json: { name: Validator.deviceName(params.name) },
    });
  }

  /**
   * Revoca un device (soft, mantiene lo storico).
   * @param {string} deviceId
   * @returns {Promise<void>}
   */
  async remove(deviceId) {
    const segment = encodeURIComponent(Validator.deviceId(deviceId));
    await this.#http.request('DELETE', `/api/v1/devices/${segment}`);
  }

  /**
   * Aggiorna il token FCM.
   * Auth: `deviceToken`; usare un client con `withSession(deviceToken)`.
   *
   * @param {string | { deviceId: string, fcmToken: string }} deviceIdOrParams
   * @param {string} [fcmToken]
   * @returns {Promise<Record<string, unknown>>}
   */
  async updateFcmToken(deviceIdOrParams, fcmToken) {
    const params = isPlainObject(deviceIdOrParams)
      ? deviceIdOrParams
      : { deviceId: deviceIdOrParams, fcmToken };
    const segment = encodeURIComponent(Validator.deviceId(params.deviceId));

    return this.#http.request('POST', `/api/v1/devices/${segment}/fcm-token`, {
      json: { fcmToken: Validator.fcmToken(params.fcmToken) },
    });
  }
}
