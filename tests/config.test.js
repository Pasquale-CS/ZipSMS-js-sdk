/** Test di configurazione (equivalenti di tests/ConfigTest.php). */

import test from 'node:test';
import assert from 'node:assert/strict';

import { Config } from '../src/index.js';
import { ValidationException } from '../src/errors.js';

test('HTTPS è obbligatorio', () => {
  assert.throws(
    () => new Config({ baseUrl: 'http://api.zipsms.it', apiKey: 'sk_test_1234567890' }),
    ValidationException,
  );
});

test('HTTP è consentito su localhost', () => {
  const config = new Config({ baseUrl: 'http://localhost:3001', apiKey: 'sk_test_1234567890' });
  assert.equal(config.baseUrl, 'http://localhost:3001');
});

test('HTTP è consentito su loopback e suffissi locali', () => {
  for (const url of [
    'http://127.0.0.1:8000',
    'http://[::1]:8000',
    'http://api.local',
    'http://api.test',
  ]) {
    assert.equal(new Config({ baseUrl: url }).baseUrl, url);
  }
});

test('rifiuta API key troppo corte', () => {
  assert.throws(
    () => new Config({ baseUrl: 'https://api.zipsms.it', apiKey: 'short' }),
    ValidationException,
  );
});

test('rifiuta credenziali con whitespace/CRLF', () => {
  assert.throws(
    () =>
      new Config({
        baseUrl: 'https://api.zipsms.it',
        apiKey: 'sk_test_1234567890\nX-Injected: 1',
      }),
    ValidationException,
  );
});

test('rimuove lo slash finale', () => {
  assert.equal(new Config({ baseUrl: 'https://api.zipsms.it/' }).baseUrl, 'https://api.zipsms.it');
});

test('valida timeout e connectTimeout', () => {
  assert.throws(() => new Config({ timeout: 0.5 }), ValidationException);
  assert.throws(() => new Config({ connectTimeout: 121 }), ValidationException);
});

test('Config.create accetta snake_case e camelCase', () => {
  const config = Config.create({
    apiKey: 'sk_test_1234567890',
    session_token: 'sess_test_1234567890',
    baseUrl: 'https://api.zipsms.it',
  });

  assert.equal(config.apiKey, 'sk_test_1234567890');
  assert.equal(config.bearerToken, 'sess_test_1234567890');
  assert.equal(config.baseUrl, 'https://api.zipsms.it');
});

test('withApiKey restituisce una nuova config', () => {
  const original = new Config({ apiKey: 'sk_test_1234567890' });
  const updated = original.withApiKey('sk_test_0987654321');

  assert.equal(original.apiKey, 'sk_test_1234567890');
  assert.equal(updated.apiKey, 'sk_test_0987654321');
});

test('le credenziali non compaiono in JSON/toString', () => {
  const config = new Config({
    apiKey: 'sk_test_1234567890',
    bearerToken: 'sess_test_1234567890',
  });
  const serialized = JSON.stringify(config);

  assert.ok(!serialized.includes('sk_test_1234567890'));
  assert.ok(!serialized.includes('sess_test_1234567890'));
  assert.ok(serialized.includes('"apiKey":"***"'));
});

test('la config è congelata', () => {
  const config = new Config({ apiKey: 'sk_test_1234567890' });
  assert.ok(Object.isFrozen(config));
});

test('rifiuta credenziali/query string nel baseUrl', () => {
  assert.throws(
    () => new Config({ baseUrl: 'https://user:pass@api.zipsms.it' }),
    ValidationException,
  );
  assert.throws(
    () => new Config({ baseUrl: 'https://api.zipsms.it?x=1' }),
    ValidationException,
  );
  assert.throws(
    () => new Config({ baseUrl: 'https://api.zipsms.it#frag' }),
    ValidationException,
  );
});

test('Config.create non coercizza credenziali non stringa', () => {
  assert.throws(
    () => Config.create({ apiKey: 12345678 }),
    ValidationException,
  );
});
