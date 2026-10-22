/** Utility condivise, senza dipendenze da Node o dal browser. */

const encoder = new TextEncoder();

/**
 * Numero di byte UTF-8 (equivalente di `strlen` in PHP).
 * @param {string} value
 * @returns {number}
 */
export function byteLength(value) {
  return encoder.encode(value).length;
}

/**
 * Numero di caratteri Unicode (equivalente di `mb_strlen` in PHP).
 * @param {string} value
 * @returns {number}
 */
export function charLength(value) {
  return Array.from(value).length;
}

/**
 * UUIDv4. Usa Web Crypto quando disponibile, con fallback per ambienti
 * molto vecchi. Le Idempotency-Key non sono segreti crittografici, ma il
 * percorso Web Crypto evita collisioni prevedibili.
 * @returns {string}
 */
export function generateUuidV4() {
  const cryptoObject = globalThis.crypto;

  if (cryptoObject && typeof cryptoObject.randomUUID === 'function') {
    return cryptoObject.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (cryptoObject && typeof cryptoObject.getRandomValues === 'function') {
    cryptoObject.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
export function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {number} milliseconds
 * @returns {Promise<void>}
 */
export function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
