/** Test dell'helper condiviso dalle integrazioni framework. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { Config, ZipSmsClient } from '../src/index.js';
import { resolveClient } from '../src/integrations/shared.js';

const config = new Config({
  baseUrl: 'http://localhost:3001',
  apiKey: 'sk_test_1234567890',
});

test('resolveClient restituisce un client esistente', () => {
  const client = new ZipSmsClient(config);
  assert.equal(resolveClient(client), client);
});

test('resolveClient accetta una Config', () => {
  const client = resolveClient(config);
  assert.ok(client instanceof ZipSmsClient);
  assert.equal(client.config, config);
});

test('resolveClient accetta un oggetto di configurazione', () => {
  const client = resolveClient({
    baseUrl: 'http://localhost:3001',
    apiKey: 'sk_test_1234567890',
  });
  assert.ok(client instanceof ZipSmsClient);
  assert.equal(client.config.baseUrl, 'http://localhost:3001');
});

test('resolveClient rifiuta valori non validi', () => {
  assert.throws(() => resolveClient(null), TypeError);
  assert.throws(() => resolveClient('sk_test_1234567890'), TypeError);
});
