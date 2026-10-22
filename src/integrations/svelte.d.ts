import type { Writable } from 'svelte/store';
import type {
  ClientOptions,
  Config,
  ConfigOptions,
  ZipSmsClient,
} from '../index.js';

export function setZipSms(
  configOrClient: ZipSmsClient | Config | ConfigOptions,
  options?: ClientOptions,
): Writable<ZipSmsClient>;

export function useZipSms(): Writable<ZipSmsClient>;
export function getZipSms(): ZipSmsClient;
