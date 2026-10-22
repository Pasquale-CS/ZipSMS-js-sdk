/** Helper condivisi dai test (mock fetch, client). */

import { Config, ZipSmsClient } from '../src/index.js';

/**
 * @param {Array<{ status?: number, body?: unknown, headers?: Record<string, string> }>} queue
 */
export function mockFetch(queue) {
  /** @type {Array<{ url: string, init: RequestInit, headers: Headers, body: string | undefined }>} */
  const calls = [];

  /**
   * @param {string | URL} input
   * @param {RequestInit} [init]
   */
  const fetch = async (input, init = {}) => {
    calls.push({
      url: String(input),
      init,
      headers: new Headers(init.headers),
      body: typeof init.body === 'string' ? init.body : undefined,
    });

    const next = queue.shift();
    if (!next) {
      throw new Error('Nessuna risposta finta disponibile');
    }

    const body = next.body === undefined ? null : next.body;
    return new Response(body, {
      status: next.status ?? 200,
      headers: next.headers,
    });
  };

  return { fetch, calls };
}

/**
 * @param {Array<{ status?: number, body?: unknown, headers?: Record<string, string> }>} queue
 * @param {Record<string, unknown>} [configOverrides]
 */
export function testClient(queue, configOverrides = {}) {
  const { fetch, calls } = mockFetch(queue);
  const client = new ZipSmsClient(
    new Config({
      baseUrl: 'http://localhost:3001',
      apiKey: 'sk_test_1234567890',
      ...configOverrides,
    }),
    { fetch },
  );

  return { client, calls };
}
