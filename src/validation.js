/**
 * Validazione client-side di tutti gli input (fail-fast + sicurezza).
 *
 * - Il telefono viene normalizzato (rimossi spazi/trattini/punti) e deve
 *   rispettare E.164: `^\+[1-9]\d{7,14}$` (max 15 cifre dopo il `+`).
 * - Il messaggio: 1..1600 caratteri, niente solo-spazi/control-char.
 * - `Idempotency-Key`: se assente viene generato un UUIDv4; se fornita deve
 *   essere 1..64 caratteri ASCII stampabili senza spazi (sicura come header).
 */

import { ValidationException } from './errors.js';
import { byteLength, charLength, generateUuidV4 } from './utils.js';

const PHONE_SEPARATORS = /[\s\-.()]/g;
const PHONE = /^\+[1-9]\d{7,14}$/;
const DEVICE_ID = /^[A-Za-z0-9_\-.:/+=]+$/;
const DEVICE_NAME = /^[a-z0-9\-_]+$/;
const CONTROL = /[\x00-\x1F\x7F]/;
const CONTROL_ONLY = /^[\p{C}\s]+$/u;
const PRINTABLE_ASCII = /^[!-~]+$/;

export class Validator {
  static MESSAGE_MAX_LENGTH = 1600;
  static REFERENCE_MAX_LENGTH = 128;
  static DEVICE_NAME_MAX_LENGTH = 32;
  static DEVICE_ID_MAX_LENGTH = 128;
  static IDEMPOTENCY_KEY_MAX_LENGTH = 64;
  static FCM_TOKEN_MAX_LENGTH = 4096;
  static DEVICE_IDS_MAX = 50;

  /**
   * Normalizza e valida un numero E.164.
   * @param {string} to
   * @returns {string}
   */
  static phone(to) {
    if (typeof to !== 'string') {
      throw new ValidationException('Destinatario non valido: numero vuoto.');
    }

    const normalized = to.trim().replace(PHONE_SEPARATORS, '');
    if (normalized === '') {
      throw new ValidationException('Destinatario non valido: numero vuoto.');
    }
    if (!PHONE.test(normalized)) {
      throw new ValidationException(
        'Destinatario non valido: usare il formato E.164 (es. +393331234567).',
      );
    }
    return normalized;
  }

  /**
   * @param {string} message
   * @returns {string}
   */
  static message(message) {
    if (typeof message !== 'string') {
      throw new ValidationException('Messaggio non valido: testo vuoto.');
    }

    const text = message.trim();
    if (text === '') {
      throw new ValidationException('Messaggio non valido: testo vuoto.');
    }

    const length = charLength(text);
    if (length > Validator.MESSAGE_MAX_LENGTH) {
      throw new ValidationException(
        `Messaggio non valido: max ${Validator.MESSAGE_MAX_LENGTH} caratteri (${length} forniti).`,
      );
    }
    if (CONTROL_ONLY.test(text)) {
      throw new ValidationException('Messaggio non valido: solo caratteri di controllo.');
    }
    return text;
  }

  /**
   * @param {string} deviceId
   * @returns {string}
   */
  static deviceId(deviceId) {
    if (typeof deviceId !== 'string') {
      throw new ValidationException('deviceId non valido: richiesto 1..128 caratteri.');
    }

    const value = deviceId.trim();
    if (value === '' || byteLength(value) > Validator.DEVICE_ID_MAX_LENGTH) {
      throw new ValidationException('deviceId non valido: richiesto 1..128 caratteri.');
    }
    if (!DEVICE_ID.test(value)) {
      throw new ValidationException(
        'deviceId non valido: caratteri consentiti [A-Za-z0-9_-. :/+=].',
      );
    }
    return value;
  }

  /**
   * @param {string} smsId
   * @returns {string}
   */
  static smsId(smsId) {
    if (typeof smsId !== 'string') {
      throw new ValidationException('SMS id non valido.');
    }

    const value = smsId.trim();
    if (value === '' || byteLength(value) > Validator.DEVICE_ID_MAX_LENGTH) {
      throw new ValidationException('SMS id non valido.');
    }
    return value;
  }

  /**
   * @param {string | null | undefined} reference
   * @returns {string | null}
   */
  static reference(reference) {
    if (reference === null || reference === undefined) {
      return null;
    }
    if (typeof reference !== 'string') {
      throw new ValidationException('reference non valido: contiene caratteri di controllo.');
    }

    const value = reference.trim();
    if (value === '') {
      return null;
    }
    if (charLength(value) > Validator.REFERENCE_MAX_LENGTH) {
      throw new ValidationException(
        `reference troppo lungo: max ${Validator.REFERENCE_MAX_LENGTH} caratteri.`,
      );
    }
    if (CONTROL.test(value)) {
      throw new ValidationException('reference non valido: contiene caratteri di controllo.');
    }
    return value;
  }

  /**
   * @param {string} name
   * @returns {string}
   */
  static deviceName(name) {
    if (typeof name !== 'string') {
      throw new ValidationException(
        `Nome device non valido: 1..${Validator.DEVICE_NAME_MAX_LENGTH} caratteri.`,
      );
    }

    const value = name.trim();
    if (value === '' || charLength(value) > Validator.DEVICE_NAME_MAX_LENGTH) {
      throw new ValidationException(
        `Nome device non valido: 1..${Validator.DEVICE_NAME_MAX_LENGTH} caratteri.`,
      );
    }
    if (!DEVICE_NAME.test(value)) {
      throw new ValidationException('Nome device non valido: usare solo [a-z0-9-_], max 32.');
    }
    return value;
  }

  /**
   * @param {string} token
   * @returns {string}
   */
  static fcmToken(token) {
    if (typeof token !== 'string') {
      throw new ValidationException('FCM token non valido.');
    }

    const value = token.trim();
    if (value === '' || byteLength(value) > Validator.FCM_TOKEN_MAX_LENGTH) {
      throw new ValidationException('FCM token non valido.');
    }
    if (/[\s\x00-\x1F\x7F]/.test(value)) {
      throw new ValidationException(
        'FCM token non valido: contiene spazi o caratteri di controllo.',
      );
    }
    return value;
  }

  /**
   * @returns {string}
   */
  static generateIdempotencyKey() {
    return generateUuidV4();
  }

  /**
   * @param {string | null | undefined} key
   * @returns {string}
   */
  static idempotencyKey(key) {
    if (key === null || key === undefined || (typeof key === 'string' && key.trim() === '')) {
      return Validator.generateIdempotencyKey();
    }
    if (typeof key !== 'string') {
      throw new ValidationException(
        'Idempotency-Key non valida: solo ASCII stampabile, senza spazi.',
      );
    }

    const value = key.trim();
    if (value.length > Validator.IDEMPOTENCY_KEY_MAX_LENGTH) {
      throw new ValidationException(
        `Idempotency-Key troppo lunga: max ${Validator.IDEMPOTENCY_KEY_MAX_LENGTH}.`,
      );
    }
    if (!PRINTABLE_ASCII.test(value)) {
      throw new ValidationException(
        'Idempotency-Key non valida: solo ASCII stampabile, senza spazi.',
      );
    }
    return value;
  }

  /**
   * @param {string[]} ids
   * @param {number} [maxItems]
   * @returns {string[]}
   */
  static deviceIds(ids, maxItems = Validator.DEVICE_IDS_MAX) {
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > maxItems) {
      throw new ValidationException(`deviceIds non valido: servono 1..${maxItems} elementi.`);
    }
    return ids.map((id) => Validator.deviceId(id));
  }

  /**
   * Target del device: esattamente uno tra deviceId e deviceName.
   * @param {string | null | undefined} deviceId
   * @param {string | null | undefined} deviceName
   * @returns {{ deviceId?: string, deviceName?: string }}
   */
  static deviceTarget(deviceId, deviceName) {
    const hasId = deviceId !== null && deviceId !== undefined && String(deviceId).trim() !== '';
    const hasName =
      deviceName !== null && deviceName !== undefined && String(deviceName).trim() !== '';

    if (hasId === hasName) {
      throw new ValidationException(
        'Indicare esattamente uno tra deviceId e deviceName (uno solo, non entrambi).',
      );
    }

    if (hasId) {
      return { deviceId: Validator.deviceId(deviceId) };
    }
    return { deviceName: Validator.deviceName(deviceName) };
  }
}
