import type { EnvironmentProviders, InjectionToken } from '@angular/core';
import type {
  ClientOptions,
  Config,
  ConfigOptions,
  ZipSmsClient,
} from '../index.js';

export const ZIP_SMS_CLIENT: InjectionToken<ZipSmsClient>;

export function provideZipSms(
  configOrClient: ZipSmsClient | Config | ConfigOptions,
  options?: ClientOptions,
): EnvironmentProviders;

export function injectZipSms(): ZipSmsClient;
