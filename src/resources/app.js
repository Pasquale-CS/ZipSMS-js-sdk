/** Endpoint pubblico: versione minima e URL APK. */

import { HttpClient } from '../http.js';

export class App {
  #http;

  /** @param {HttpClient} http */
  constructor(http) {
    this.#http = http;
  }

  /**
   * Restituisce versione minima e URL dell'APK.
   * @returns {Promise<Record<string, unknown>>}
   */
  async version() {
    return this.#http.request('GET', '/api/v1/app/version');
  }
}
