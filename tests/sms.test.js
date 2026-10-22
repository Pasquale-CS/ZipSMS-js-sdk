/** Test HTTP/SMS (equivalenti di tests/SmsTest.php). */

import test from 'node:test';
import assert from 'node:assert/strict';

import { Config, ZipSmsClient } from '../src/index.js';
import {
  AuthenticationException,
  ConflictException,
  NetworkException,
  NotFoundException,
  RateLimitException,
  ServerException,
  ValidationException,
} from '../src/errors.js';
import { mockFetch, testClient } from './helpers.js';

test('send invia il payload corretto', async () => {
  const { client, calls } = testClient([
    {
      status: 202,
      body: JSON.stringify({ id: 'uuid-1', status: 'QUEUED', segments: 1 }),
      headers: { 'Content-Type': 'application/json' },
    },
  ]);

  const result = await client.sms().send({
    to: '+39 333 123 4567',
    message: 'Ciao!',
    deviceId: 'dev-1',
    reference: 'ordine-1',
    idempotencyKey: 'key-123',
  });

  assert.equal(result.id, 'uuid-1');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].url, 'http://localhost:3001/api/v1/sms/send');
  assert.equal(calls[0].headers.get('Idempotency-Key'), 'key-123');
  assert.equal(calls[0].headers.get('x-api-key'), 'sk_test_1234567890');
  assert.equal(calls[0].headers.get('Content-Type'), 'application/json');

  const body = JSON.parse(calls[0].body);
  assert.equal(body.to, '+393331234567');
  assert.equal(body.deviceId, 'dev-1');
  assert.equal(body.reference, 'ordine-1');
});

test('send supporta anche la forma posizionale', async () => {
  const { client, calls } = testClient([
    { status: 202, body: JSON.stringify({ id: 'uuid-1', status: 'QUEUED' }) },
  ]);

  await client.sms().send('+393331234567', 'Ciao!', {
    deviceName: 'ufficio-1',
    idempotencyKey: 'pos-1',
  });

  const body = JSON.parse(calls[0].body);
  assert.equal(body.deviceName, 'ufficio-1');
  assert.equal(calls[0].headers.get('Idempotency-Key'), 'pos-1');
});

test('send genera automaticamente Idempotency-Key', async () => {
  const { client, calls } = testClient([
    { status: 202, body: JSON.stringify({ id: 'uuid-2', status: 'QUEUED' }) },
  ]);

  await client.sms().send({ to: '+393331234567', message: 'Ciao!', deviceId: 'dev-1' });

  const key = calls[0].headers.get('Idempotency-Key');
  assert.ok(key);
  assert.ok(!key.includes('\n'));
});

test('send valida prima della chiamata HTTP', async () => {
  const { client, calls } = testClient([{ status: 202, body: '{}' }]);

  await assert.rejects(
    () => client.sms().send({ to: 'not-a-number', message: 'Ciao!', deviceId: 'dev-1' }),
    ValidationException,
  );
  assert.equal(calls.length, 0);
});

test('send by deviceName non include deviceId', async () => {
  const { client, calls } = testClient([
    { status: 202, body: JSON.stringify({ id: 'uuid-3', status: 'QUEUED' }) },
  ]);

  await client.sms().send({ to: '+393331234567', message: 'Ciao!', deviceName: 'ufficio-1' });

  const body = JSON.parse(calls[0].body);
  assert.equal(body.deviceName, 'ufficio-1');
  assert.equal(body.deviceId, undefined);
});

test('send rifiuta entrambi i target', async () => {
  const { client, calls } = testClient([{ status: 202, body: '{}' }]);

  await assert.rejects(
    () =>
      client.sms().send({
        to: '+393331234567',
        message: 'Ciao!',
        deviceId: 'dev-1',
        deviceName: 'ufficio-1',
      }),
    (error) => error instanceof ValidationException && /esattamente uno/.test(error.message),
  );
  assert.equal(calls.length, 0);
});

test('send rifiuta target mancante', async () => {
  const { client, calls } = testClient([{ status: 202, body: '{}' }]);

  await assert.rejects(
    () => client.sms().send({ to: '+393331234567', message: 'Ciao!' }),
    (error) => error instanceof ValidationException && /esattamente uno/.test(error.message),
  );
  assert.equal(calls.length, 0);
});

test('mappa 401 in AuthenticationException', async () => {
  const { client } = testClient([
    {
      status: 401,
      body: JSON.stringify({ message: 'API key non valida', code: 'INVALID_API_KEY' }),
    },
  ]);

  await assert.rejects(
    () => client.sms().get('sms-id'),
    (error) =>
      error instanceof AuthenticationException &&
      error.statusCode === 401 &&
      error.errorCode === 'INVALID_API_KEY' &&
      !error.message.includes('sk_test'),
  );
});

test('mappa 404', async () => {
  const { client } = testClient([
    { status: 404, body: JSON.stringify({ message: 'Non trovato', code: 'NOT_FOUND' }) },
  ]);
  await assert.rejects(() => client.sms().get('sms-id'), NotFoundException);
});

test('mappa 409', async () => {
  const { client } = testClient([
    { status: 409, body: JSON.stringify({ message: 'Conflitto', code: 'DEVICE_REVOKED' }) },
  ]);
  await assert.rejects(
    () => client.devices().rename('dev-1', 'ufficio-2'),
    ConflictException,
  );
});

test('mappa 429 con Retry-After', async () => {
  const { client } = testClient([
    {
      status: 429,
      body: JSON.stringify({ message: 'Quota esaurita', code: 'API_QUOTA_EXCEEDED' }),
      headers: { 'Retry-After': '42' },
    },
  ]);

  await assert.rejects(
    () => client.sms().get('sms-id'),
    (error) =>
      error instanceof RateLimitException &&
      error.retryAfterSeconds === 42 &&
      error.errorCode === 'API_QUOTA_EXCEEDED',
  );
});

test('mappa 5xx e risposte non JSON', async () => {
  const { client } = testClient([{ status: 502, body: 'bad gateway' }]);
  await assert.rejects(
    () => client.app().version(),
    (error) => error instanceof ServerException && error.statusCode === 502,
  );
});

test('list costruisce la query e applica i limiti', async () => {
  const { client, calls } = testClient([{ status: 200, body: JSON.stringify({ data: [] }) }]);

  await client.sms().list({
    status: 'QUEUED',
    deviceId: 'dev-1',
    from: 'ordine',
    page: 0,
    limit: 500,
  });

  const url = new URL(calls[0].url);
  assert.equal(url.pathname, '/api/v1/sms');
  assert.equal(url.searchParams.get('status'), 'QUEUED');
  assert.equal(url.searchParams.get('deviceId'), 'dev-1');
  assert.equal(url.searchParams.get('from'), 'ordine');
  assert.equal(url.searchParams.get('page'), '1');
  assert.equal(url.searchParams.get('limit'), '100');
});

test('list accetta alias JavaScript', async () => {
  const { client, calls } = testClient([{ status: 200, body: '{}' }]);

  await client.sms().list({ device_id: 'dev-1', from_: 'ordine', page: 2, limit: 10 });

  const url = new URL(calls[0].url);
  assert.equal(url.searchParams.get('deviceId'), 'dev-1');
  assert.equal(url.searchParams.get('from'), 'ordine');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(url.searchParams.get('limit'), '10');
});

test('sendAndWait restituisce lo stato terminale', async () => {
  const { client, calls } = testClient([
    { status: 202, body: JSON.stringify({ id: 'uuid-4', status: 'QUEUED' }) },
    { status: 200, body: JSON.stringify({ id: 'uuid-4', status: 'DELIVERED' }) },
  ]);

  const result = await client.sms().sendAndWait({
    to: '+393331234567',
    message: 'Ciao!',
    deviceId: 'dev-1',
    timeoutSeconds: 5,
    pollIntervalSeconds: 1,
  });

  assert.equal(result.status, 'DELIVERED');
  assert.equal(calls.length, 2);
});

test('devices.create costruisce il payload e accetta extra', async () => {
  const { client, calls } = testClient([
    { status: 201, body: JSON.stringify({ id: 'dev-1', deviceToken: 'secret-token' }) },
  ]);

  await client.devices().create({
    name: 'ufficio-1',
    fcmToken: 'fcm-token-123',
    deviceId: 'android-1',
    androidVersion: '14',
    ignored: 'x',
  });

  const body = JSON.parse(calls[0].body);
  assert.equal(body.name, 'ufficio-1');
  assert.equal(body.fcmToken, 'fcm-token-123');
  assert.equal(body.deviceId, 'android-1');
  assert.equal(body.androidVersion, '14');
  assert.equal(body.ignored, undefined);
});

test('devices.create supporta la forma posizionale', async () => {
  const { client, calls } = testClient([{ status: 201, body: '{}' }]);

  await client.devices().create('ufficio-1', 'fcm-token-123', { appVersion: '1.2.3' });

  const body = JSON.parse(calls[0].body);
  assert.equal(body.name, 'ufficio-1');
  assert.equal(body.fcmToken, 'fcm-token-123');
  assert.equal(body.appVersion, '1.2.3');
});

test('il path del device è URL-encoded', async () => {
  const { client, calls } = testClient([{ status: 200, body: '{}' }]);
  await client.devices().claim('dev/1');
  assert.equal(calls[0].url, 'http://localhost:3001/api/v1/devices/dev%2F1/claim');
});

test('remove accetta 204', async () => {
  const { client, calls } = testClient([{ status: 204 }]);
  await client.devices().remove('dev-1');
  assert.equal(calls[0].init.method, 'DELETE');
});

test('withSession usa il Bearer', async () => {
  const { fetch, calls } = mockFetch([{ status: 200, body: '{}' }]);
  const client = ZipSmsClient.withSession('sess_test_1234567890', 'https://api.zipsms.it', {
    fetch,
  });

  await client.usage().get();

  assert.equal(calls[0].headers.get('Authorization'), 'Bearer sess_test_1234567890');
  assert.equal(calls[0].headers.get('x-api-key'), null);
});

test('risposte JSON scalari vengono incapsulate in data', async () => {
  const { client } = testClient([{ status: 200, body: '42' }]);
  assert.deepEqual(await client.app().version(), { data: 42 });
});

test('sendFromDashboard invia il payload multi-device', async () => {
  const { client, calls } = testClient([{ status: 200, body: JSON.stringify({ results: [] }) }]);

  await client.sms().sendFromDashboard({
    deviceIds: ['dev-1', 'dev-2'],
    to: '+393331234567',
    message: 'Ciao!',
    reference: 'campagna-1',
  });

  const body = JSON.parse(calls[0].body);
  assert.deepEqual(body.deviceIds, ['dev-1', 'dev-2']);
  assert.equal(body.to, '+393331234567');
  assert.equal(body.reference, 'campagna-1');
  assert.equal(calls[0].url, 'http://localhost:3001/api/v1/sms/send-from-dashboard');
});

test('devices.resume e updateFcmToken inviano i payload corretti', async () => {
  const { client, calls } = testClient([
    { status: 200, body: '{}' },
    { status: 200, body: '{}' },
  ]);

  await client.devices().resume('dev-1', 'fcm-token-123');
  await client.devices().updateFcmToken({ deviceId: 'dev-1', fcmToken: 'fcm-token-456' });

  assert.equal(calls[0].url, 'http://localhost:3001/api/v1/devices/resume');
  assert.deepEqual(JSON.parse(calls[0].body), {
    deviceId: 'dev-1',
    fcmToken: 'fcm-token-123',
  });
  assert.equal(
    calls[1].url,
    'http://localhost:3001/api/v1/devices/dev-1/fcm-token',
  );
  assert.deepEqual(JSON.parse(calls[1].body), { fcmToken: 'fcm-token-456' });
});

test('gli errori di trasporto diventano NetworkException', async () => {
  const client = new ZipSmsClient(
    new Config({
      baseUrl: 'http://localhost:3001',
      apiKey: 'sk_test_1234567890',
    }),
    {
      fetch: async () => {
        throw new TypeError('fetch failed');
      },
    },
  );

  await assert.rejects(
    () => client.app().version(),
    (error) => error instanceof NetworkException && /Errore di rete/.test(error.message),
  );
});

test('il timeout complessivo diventa NetworkException', async () => {
  const client = new ZipSmsClient(
    new Config({
      baseUrl: 'http://localhost:3001',
      apiKey: 'sk_test_1234567890',
      timeout: 1,
      connectTimeout: 120,
    }),
    {
      fetch: (_input, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    },
  );

  await assert.rejects(
    () => client.app().version(),
    (error) => error instanceof NetworkException && /Timeout/.test(error.message),
  );
});
