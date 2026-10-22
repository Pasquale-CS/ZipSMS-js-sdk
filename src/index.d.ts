/** Tipi pubblici dell'SDK ZipSMS per JavaScript/TypeScript. */

export type FetchLike = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface ConfigOptions {
  baseUrl?: string;
  apiKey?: string | null;
  bearerToken?: string | null;
  sessionToken?: string | null;
  timeout?: number;
  connectTimeout?: number;
}

export class Config {
  constructor(options?: ConfigOptions);
  readonly baseUrl: string;
  readonly apiKey: string | null;
  readonly bearerToken: string | null;
  readonly timeout: number;
  readonly connectTimeout: number;
  static create(values?: Record<string, unknown> | Config): Config;
  static assertCredential(value: string, label: string): void;
  withApiKey(apiKey: string): Config;
  withBearerToken(bearerToken: string): Config;
  toJSON(): {
    baseUrl: string;
    apiKey: '***' | null;
    bearerToken: '***' | null;
    timeout: number;
    connectTimeout: number;
  };
}

export interface ZipSmsErrorOptions {
  errorCode?: string | null;
  statusCode?: number;
  cause?: unknown;
}

export class ZipSmsException extends Error {
  constructor(message: string, options?: ZipSmsErrorOptions);
  readonly errorCode: string | null;
  readonly statusCode: number;
}

export class ValidationException extends ZipSmsException {}
export class AuthenticationException extends ZipSmsException {}
export class NotFoundException extends ZipSmsException {}
export class ConflictException extends ZipSmsException {}
export class ServerException extends ZipSmsException {}
export class NetworkException extends ZipSmsException {}
export class RateLimitException extends ZipSmsException {
  constructor(
    message: string,
    options?: ZipSmsErrorOptions & { retryAfterSeconds?: number | null },
  );
  readonly retryAfterSeconds: number | null;
}

export class Validator {
  static readonly MESSAGE_MAX_LENGTH: number;
  static readonly REFERENCE_MAX_LENGTH: number;
  static readonly DEVICE_NAME_MAX_LENGTH: number;
  static readonly DEVICE_ID_MAX_LENGTH: number;
  static readonly IDEMPOTENCY_KEY_MAX_LENGTH: number;
  static readonly FCM_TOKEN_MAX_LENGTH: number;
  static readonly DEVICE_IDS_MAX: number;
  static phone(to: string): string;
  static message(message: string): string;
  static deviceId(deviceId: string): string;
  static smsId(smsId: string): string;
  static reference(reference?: string | null): string | null;
  static deviceName(name: string): string;
  static fcmToken(token: string): string;
  static generateIdempotencyKey(): string;
  static idempotencyKey(key?: string | null): string;
  static deviceIds(ids: string[], maxItems?: number): string[];
  static deviceTarget(
    deviceId?: string | null,
    deviceName?: string | null,
  ): { deviceId?: string; deviceName?: string };
}

export interface SendSmsParams {
  to: string;
  message: string;
  deviceId?: string;
  deviceName?: string;
  reference?: string | null;
  idempotencyKey?: string | null;
}

export interface SendAndWaitParams extends SendSmsParams {
  timeoutSeconds?: number;
  pollIntervalSeconds?: number;
}

export interface SendFromDashboardParams {
  deviceIds: string[];
  to: string;
  message: string;
  reference?: string | null;
}

export interface ListSmsFilters {
  status?: string;
  deviceId?: string;
  device_id?: string;
  source?: string;
  from?: string;
  from_?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface CreateDeviceParams {
  name: string;
  fcmToken: string;
  deviceId?: string;
  device_id?: string;
  androidVersion?: string;
  android_version?: string;
  appVersion?: string;
  app_version?: string;
}

export interface ResumeDeviceParams {
  deviceId: string;
  fcmToken: string;
}

export interface UpdateFcmTokenParams {
  deviceId: string;
  fcmToken: string;
}

type SmsResponse = Record<string, unknown> & {
  id?: string;
  status?: string;
  segments?: number;
};

export class Sms {
  send(params: SendSmsParams): Promise<SmsResponse>;
  send(
    to: string,
    message: string,
    options?: Omit<SendSmsParams, 'to' | 'message'>,
  ): Promise<SmsResponse>;
  sendAndWait(params: SendAndWaitParams): Promise<SmsResponse>;
  sendAndWait(
    to: string,
    message: string,
    options?: Omit<SendAndWaitParams, 'to' | 'message'>,
  ): Promise<SmsResponse>;
  get(smsId: string): Promise<SmsResponse>;
  list(filters?: ListSmsFilters): Promise<Record<string, unknown>>;
  sendFromDashboard(
    params: SendFromDashboardParams,
  ): Promise<Record<string, unknown>>;
  sendFromDashboard(
    deviceIds: string[],
    to: string,
    message: string,
    reference?: string,
  ): Promise<Record<string, unknown>>;
}

export class Devices {
  create(params: CreateDeviceParams): Promise<Record<string, unknown>>;
  create(
    name: string,
    fcmToken: string,
    extra?: Omit<CreateDeviceParams, 'name' | 'fcmToken'>,
  ): Promise<Record<string, unknown>>;
  list(): Promise<Record<string, unknown>>;
  resume(params: ResumeDeviceParams): Promise<Record<string, unknown>>;
  resume(deviceId: string, fcmToken: string): Promise<Record<string, unknown>>;
  claim(deviceId: string): Promise<Record<string, unknown>>;
  rename(
    params: { deviceId: string; name: string },
  ): Promise<Record<string, unknown>>;
  rename(deviceId: string, name: string): Promise<Record<string, unknown>>;
  remove(deviceId: string): Promise<void>;
  updateFcmToken(
    params: UpdateFcmTokenParams,
  ): Promise<Record<string, unknown>>;
  updateFcmToken(
    deviceId: string,
    fcmToken: string,
  ): Promise<Record<string, unknown>>;
}

export class Usage {
  get(): Promise<Record<string, unknown>>;
}

export class App {
  version(): Promise<Record<string, unknown>>;
}

export interface ClientOptions extends ConfigOptions {
  fetch?: FetchLike;
}

export class ZipSmsClient {
  constructor(config: Config, options?: { fetch?: FetchLike });
  static create(
    apiKey: string,
    baseUrl?: string,
    options?: ClientOptions,
  ): ZipSmsClient;
  static withSession(
    bearerToken: string,
    baseUrl?: string,
    options?: ClientOptions,
  ): ZipSmsClient;
  readonly config: Config;
  sms(): Sms;
  devices(): Devices;
  usage(): Usage;
  app(): App;
  toString(): string;
}

export { ZipSmsClient as ZipSMSClient };

export const VERSION: string;
export const DEFAULT_BASE_URL: string;
export const DEFAULT_TIMEOUT: number;
export const DEFAULT_CONNECT_TIMEOUT: number;

export class HttpClient {
  constructor(config: Config, options?: { fetch?: FetchLike });
  request(
    method: string,
    path: string,
    options?: Record<string, unknown>,
  ): Promise<Record<string, unknown> | unknown[]>;
}
