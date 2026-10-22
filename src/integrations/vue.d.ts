import type { App, InjectionKey } from 'vue';
import type {
  ClientOptions,
  Config,
  ConfigOptions,
  ZipSmsClient,
} from '../index.js';

export const ZIP_SMS_KEY: InjectionKey<ZipSmsClient>;

export interface ZipSmsPlugin {
  install(app: App): void;
}

export function createZipSmsPlugin(
  configOrClient: ZipSmsClient | Config | ConfigOptions,
  options?: ClientOptions,
): ZipSmsPlugin;

export function provideZipSms(
  configOrClient: ZipSmsClient | Config | ConfigOptions,
  options?: ClientOptions,
): ZipSmsClient;

export function useZipSms(): ZipSmsClient;

declare module 'vue' {
  interface ComponentCustomProperties {
    $zipsms: ZipSmsClient;
  }
}
