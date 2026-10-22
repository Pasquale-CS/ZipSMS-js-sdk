/** Esempio Angular 16+ (standalone API).
 *
 * La API key dovrebbe arrivare da environment server-side o da un backend.
 */

import { Component, inject } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideZipSms, injectZipSms } from '../src/integrations/angular.js';

@Component({
  selector: 'app-root',
  standalone: true,
  template: '<button (click)="notify()">Invia SMS</button>',
})
export class AppComponent {
  private readonly zipsms = injectZipSms();

  async notify(): Promise<void> {
    await this.zipsms.sms().send({
      to: '+393331234567',
      message: 'Ciao da ZipSMS!',
      deviceName: 'ufficio-1',
      reference: 'ordine-123',
      idempotencyKey: 'ordine-123',
    });
  }
}

bootstrapApplication(AppComponent, {
  providers: [
    provideZipSms({
      apiKey: 'sk_live_...', // usa environment.ts / variabili server-side
    }),
  ],
});
