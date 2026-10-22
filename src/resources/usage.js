/** Quote e versione app (supporto dashboard). */

import { HttpClient } from '../http.js';

export class Usage {
  #http;

  /** @param {HttpClient} http */
  constructor(http) {
    this.#http = http;
  }

  /**
   * Uso e residuo quote API/dashboard del mese (auth: Bearer).
   * @returns {Promise<Record<string, unknown>>}
   */
  async get() {
    return this.#http.request('GET', '/api/v1/usage');
  }
}
