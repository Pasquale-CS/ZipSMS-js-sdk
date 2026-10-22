/** Test di validazione (equivalenti di tests/ValidatorTest.php). */

import test from 'node:test';
import assert from 'node:assert/strict';

import { Validator } from '../src/index.js';
import { ValidationException } from '../src/errors.js';

test('normalizza il telefono', () => {
  assert.equal(Validator.phone('+39 333 123 4567'), '+393331234567');
  assert.equal(Validator.phone('+39-333-123-4567'), '+393331234567');
});

test('rifiuta telefoni non E.164', () => {
  assert.throws(() => Validator.phone('3331234567'), ValidationException);
});

test('valida la lunghezza del messaggio', () => {
  assert.equal(Validator.message('  ciao  '), 'ciao');
  assert.throws(() => Validator.message('x'.repeat(1601)), ValidationException);
});

test('rifiuta messaggi di soli caratteri di controllo', () => {
  assert.throws(() => Validator.message('\x00\x01\t '), ValidationException);
});

test('genera una Idempotency-Key UUIDv4', () => {
  const key = Validator.idempotencyKey(null);
  assert.match(
    key,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
});

test('rifiuta CRLF nella Idempotency-Key', () => {
  assert.throws(
    () => Validator.idempotencyKey('abc\r\nX-Injected: 1'),
    ValidationException,
  );
});

test('valida rigorosamente il nome device', () => {
  assert.equal(Validator.deviceName('ufficio-1'), 'ufficio-1');
  assert.throws(() => Validator.deviceName('Ufficio 1!'), ValidationException);
});

test('deviceTarget richiede esattamente un target', () => {
  assert.deepEqual(Validator.deviceTarget('dev-1', null), { deviceId: 'dev-1' });
  assert.deepEqual(Validator.deviceTarget(null, 'ufficio-1'), {
    deviceName: 'ufficio-1',
  });
  assert.throws(() => Validator.deviceTarget('dev-1', 'ufficio-1'), ValidationException);
  assert.throws(() => Validator.deviceTarget(null, null), ValidationException);
});

test('valida la lista deviceIds', () => {
  assert.deepEqual(Validator.deviceIds(['dev-1', 'dev-2']), ['dev-1', 'dev-2']);
  assert.throws(() => Validator.deviceIds([]), ValidationException);
  assert.throws(
    () => Validator.deviceIds(Array.from({ length: 51 }, (_, i) => `dev-${i}`)),
    ValidationException,
  );
  assert.throws(() => Validator.deviceIds('dev-1'), ValidationException);
});
