import type {
  Context,
  ReactElement,
  ReactNode,
} from 'react';
import type {
  ClientOptions,
  Config,
  ConfigOptions,
  ZipSmsClient,
} from '../index.js';

export const ZipSmsContext: Context<ZipSmsClient | null>;

export interface ZipSmsProviderProps {
  client?: ZipSmsClient;
  config?: ZipSmsClient | Config | ConfigOptions;
  apiKey?: string;
  baseUrl?: string;
  options?: ClientOptions;
  children?: ReactNode;
}

export function ZipSmsProvider(props: ZipSmsProviderProps): ReactElement;
export function useZipSms(): ZipSmsClient;
