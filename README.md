# ZipSMS JavaScript SDK

SDK JavaScript ufficiale per **ZipSMS Gateway** — invio SMS tramite il proprio dispositivo Android via API.

- JavaScript moderno (ESM), **zero dipendenze runtime**
- Fetch API nativa: funziona in **Node 18+**, browser e React Native
- Tipi TypeScript inclusi (`index.d.ts`)
- Integrazioni pronte per **React, Vue, Angular e Svelte**
- Validazione client-side + eccezioni tipizzate + controlli di sicurezza
- Stessa semantica degli SDK PHP e Python

## Installazione

```bash
npm install zipsms
```

```bash
yarn add zipsms
# oppure
pnpm add zipsms
```

## Uso rapido (Node / browser)

```js
import { ZipSmsClient } from 'zipsms';

const zipsms = ZipSmsClient.create(process.env.ZIPSMS_API_KEY);

const res = await zipsms.sms().send({
  to: '+393331234567',
  message: 'Ciao da ZipSMS!',
  deviceName: 'ufficio-1', // oppure deviceId: 'tuo-device-id' (esattamente uno)
  reference: 'ordine-123', // opzionale
  // idempotencyKey: undefined → UUIDv4 automatico
});

console.log(res.id, res.status); // es. QUEUED
```

È supportata anche la forma posizionale, equivalente all'SDK PHP:

```js
await zipsms.sms().send('+393331234567', 'Ciao!', {
  deviceName: 'ufficio-1',
  reference: 'ordine-123',
});
```

### Idempotenza (importante)

`POST /sms/send` richiede l'header `Idempotency-Key`. L'SDK lo genera da solo
(UUIDv4) se non lo passi — ma per retry sicuri senza doppi invii, passa una
chiave stabile legata al tuo dominio (es. `ordine-123`):

```js
await zipsms.sms().send({
  to: '+393331234567',
  message: 'Il tuo ordine è pronto!',
  deviceId: myDeviceId,
  reference: 'ordine-123',
  idempotencyKey: 'ordine-123',
});
```

### Stato / lista SMS

```js
await zipsms.sms().get(smsId);

await zipsms.sms().list({ status: 'QUEUED', page: 1, limit: 20 });

// alias JavaScript
await zipsms.sms().list({ status: 'QUEUED', device_id: 'dev-1', from_: 'ordine-123' });
```

### Invio e attesa dell'esito

```js
const detail = await zipsms.sms().sendAndWait({
  to: '+393331234567',
  message: 'Ciao!',
  deviceName: 'ufficio-1',
  timeoutSeconds: 120,
  pollIntervalSeconds: 3,
});

console.log(detail.status); // SENT / DELIVERED / FAILED
```

### Device / Usage (sessione Bearer dashboard)

```js
const dashboard = ZipSmsClient.withSession(process.env.ZIPSMS_SESSION_TOKEN);

await dashboard.devices().list();

// Conserva deviceToken cifrato: viene mostrato una sola volta.
const device = await dashboard.devices().create({
  name: 'ufficio-1',
  fcmToken,
});

await dashboard.devices().resume({ deviceId, fcmToken });
await dashboard.devices().claim(deviceId);
await dashboard.devices().rename({ deviceId, name: 'ufficio-2' });
await dashboard.devices().remove(deviceId);
await dashboard.devices().updateFcmToken({ deviceId, fcmToken }); // auth: deviceToken

await dashboard.usage().get();
await ZipSmsClient.create(apiKey).app().version(); // pubblico, niente auth
```

### Invio manuale multi-device (dashboard)

```js
await dashboard.sms().sendFromDashboard({
  deviceIds: ['device-id-1', 'device-id-2'],
  to: '+393331234567',
  message: 'Ciao a tutti!',
  reference: 'campagna-1',
});
```

## React

```jsx
import { ZipSmsProvider, useZipSms } from 'zipsms/react';

export function App() {
  return (
    <ZipSmsProvider apiKey={import.meta.env.VITE_ZIPSMS_API_KEY}>
      <OrderButton />
    </ZipSmsProvider>
  );
}

function OrderButton() {
  const zipsms = useZipSms();

  async function notify() {
    await zipsms.sms().send({
      to: '+393331234567',
      message: 'Il tuo ordine è pronto!',
      deviceName: 'ufficio-1',
      reference: 'ordine-123',
      idempotencyKey: 'ordine-123',
    });
  }

  return <button onClick={notify}>Invia SMS</button>;
}
```

Puoi passare anche un client già creato: `<ZipSmsProvider client={client}>`.
Next.js: usa il provider in un componente client (`'use client'`) e non esporre
mai l'API key al browser in produzione; meglio chiamare l'SDK da una route
server/handler.

## Vue 3

```js
// main.js
import { createApp } from 'vue';
import { createZipSmsPlugin } from 'zipsms/vue';
import App from './App.vue';

createApp(App)
  .use(createZipSmsPlugin({ apiKey: import.meta.env.VITE_ZIPSMS_API_KEY }))
  .mount('#app');
```

```js
// componente
import { useZipSms } from 'zipsms/vue';

const zipsms = useZipSms();
await zipsms.sms().send({
  to: '+393331234567',
  message: 'Ciao!',
  deviceName: 'ufficio-1',
});
```

Senza plugin puoi usare `provideZipSms(...)` in un componente padre.
Nuxt: installa il plugin in un file `plugins/zipsms.client.js` e usa la
composable nei componenti.

## Angular 16+

```ts
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideZipSms } from 'zipsms/angular';

bootstrapApplication(AppComponent, {
  providers: [
    provideZipSms({ apiKey: environment.zipsmsApiKey }),
  ],
});
```

```ts
import { Component, inject } from '@angular/core';
import { injectZipSms } from 'zipsms/angular';

@Component({ /* ... */ })
export class OrderComponent {
  private readonly zipsms = injectZipSms();

  async notify(): Promise<void> {
    await this.zipsms.sms().send({
      to: '+393331234567',
      message: 'Ciao!',
      deviceName: 'ufficio-1',
    });
  }
}
```

## Svelte 4/5

```svelte
<!-- componente padre -->
<script>
  import { setZipSms } from 'zipsms/svelte';
  const zipsms = setZipSms({ apiKey: import.meta.env.VITE_ZIPSMS_API_KEY });
</script>

<Child />
```

```svelte
<!-- componente figlio -->
<script>
  import { getZipSms } from 'zipsms/svelte';
  const zipsms = getZipSms();
</script>
```

`useZipSms()` restituisce lo store Svelte; `getZipSms()` il client corrente.

## Gestione errori

| HTTP | Eccezione | Quando |
|------|-----------|--------|
| 400/422 | `ValidationException` | E.164 errato, testo >1600, deviceId/deviceName… |
| 401/403 | `AuthenticationException` | API key mancante/revocata |
| 404 | `NotFoundException` | Device/SMS non tuo |
| 409 | `ConflictException` | Device revocato, transizione illegale |
| 429 | `RateLimitException` | Quota esaurita / rate limit (`retryAfterSeconds`, `errorCode` = `API_QUOTA_EXCEEDED`…) |
| 5xx/rete | `ServerException` / `NetworkException` | — |

Tutte estendono `ZipSmsException` (attributi `statusCode`, `errorCode`). I
messaggi non contengono mai segreti.

```js
import { RateLimitException, ZipSmsException } from 'zipsms';

try {
  await zipsms.sms().send({
    to: '+393331234567',
    message: 'Ciao!',
    deviceName: 'ufficio-1',
  });
} catch (error) {
  if (error instanceof RateLimitException) {
    console.error(`Retry tra ${error.retryAfterSeconds}s (${error.errorCode})`);
  } else if (error instanceof ZipSmsException) {
    console.error(`Errore [${error.statusCode}/${error.errorCode}]: ${error.message}`);
  } else {
    throw error;
  }
}
```

## Sicurezza (applicata dall'SDK)

- **HTTPS obbligatorio** (http solo per `localhost/127.0.0.1/::1/*.local/*.test`).
- **Validazione fail-fast**: E.164 normalizzato, messaggio 1–1600 caratteri, `Idempotency-Key` ASCII stampabile (anti header-injection), credenziali senza whitespace/control-char.
- **TLS verificato** dalla Fetch API (in Node 18+ e browser).
- **Nessun segreto nei log/eccezioni**: `Config` usa campi privati e `JSON.stringify(config)` redige le credenziali; l'API key viaggia solo nell'header `x-api-key`.
- `deviceToken` della creazione device mostrato una volta: conservalo cifrato (vault, KMS, `django-fernet-fields`/`node:crypto`).

> Nota: in un'app browser l'API key è visibile all'utente finale. Per la
> produzione usa un backend proxy (Node/Next/Nuxt/Express) che istanzia l'SDK
> lato server.

## Configurazione avanzata

```js
import { Config, ZipSmsClient } from 'zipsms';

const config = new Config({
  baseUrl: 'https://zipsms-gateway.pcs.website',
  apiKey: process.env.ZIPSMS_API_KEY,
  timeout: 15,
  connectTimeout: 5,
});

const zipsms = new ZipSmsClient(config);

// Fetch personalizzata (test, proxy, adapter, tracing):
const zipsmsWithFetch = new ZipSmsClient(config, { fetch: myFetch });
```

Variabili d'ambiente usate negli esempi:

```env
ZIPSMS_API_KEY=sk_live_...
ZIPSMS_SESSION_TOKEN=  # opzionale, per dashboard
ZIPSMS_BASE_URL=https://zipsms-gateway.pcs.website
```

`Config.create()` accetta sia camelCase (`baseUrl`, `apiKey`, `connectTimeout`)
sia snake_case (`base_url`, `api_key`, `connect_timeout`, `session_token`).

## Sviluppo

I test usano il test runner nativo di Node (nessuna dipendenza):

```bash
npm test
```

oppure:

```bash
node --test
```

## Licenza

MIT.
