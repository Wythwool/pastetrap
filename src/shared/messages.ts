import type { AppSettings, LatestTabState, LogEntry, ScanResult } from '@/shared/types';

export type RuntimeMessage =
  | { type: 'PT_GET_SETTINGS' }
  | { type: 'PT_SAVE_SETTINGS'; settings: AppSettings }
  | { type: 'PT_REPORT_SCAN'; result: ScanResult }
  | { type: 'PT_GET_PAGE_STATE'; tabId: number }
  | { type: 'PT_TRUST_DOMAIN'; domain: string }
  | { type: 'PT_UNTRUST_DOMAIN'; domain: string }
  | { type: 'PT_IGNORE_PAGE'; pageKey: string }
  | { type: 'PT_CLEAR_SESSION_IGNORES' }
  | { type: 'PT_LOG_ACTION'; entry: LogEntry }
  | { type: 'PT_GET_LOGS' }
  | { type: 'PT_CLEAR_LOGS' }
  | { type: 'PT_RESCAN_TAB'; tabId: number }
  | { type: 'PT_GET_SESSION_IGNORES' }
  | { type: 'PT_TRIGGER_SCAN'; source: 'popup-action' };

export interface SettingsResponse {
  settings: AppSettings;
  sessionIgnores: string[];
}

export interface PageStateResponse {
  state: LatestTabState | null;
}

export interface LogsResponse {
  logs: LogEntry[];
}

export interface OkResponse {
  ok: true;
}

export interface ErrorResponse {
  ok: false;
  error: string;
  repository?: string;
}

export type RuntimeResponseMap = {
  PT_GET_SETTINGS: SettingsResponse;
  PT_SAVE_SETTINGS: { settings: AppSettings };
  PT_REPORT_SCAN: OkResponse;
  PT_GET_PAGE_STATE: PageStateResponse;
  PT_TRUST_DOMAIN: OkResponse;
  PT_UNTRUST_DOMAIN: OkResponse;
  PT_IGNORE_PAGE: OkResponse;
  PT_CLEAR_SESSION_IGNORES: OkResponse;
  PT_LOG_ACTION: OkResponse;
  PT_GET_LOGS: LogsResponse;
  PT_CLEAR_LOGS: OkResponse;
  PT_RESCAN_TAB: OkResponse;
  PT_GET_SESSION_IGNORES: { sessionIgnores: string[] };
  PT_TRIGGER_SCAN: OkResponse;
};

export type RuntimeMessageType = keyof RuntimeResponseMap;

export type RuntimeRequestOf<TType extends RuntimeMessageType> = Extract<RuntimeMessage, { type: TType }>;
export type RuntimeResponseOf<TType extends RuntimeMessageType> = RuntimeResponseMap[TType];

export function isRuntimeMessage(value: unknown): value is RuntimeMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<RuntimeMessage> & { type?: unknown };
  return typeof candidate.type === 'string' && candidate.type.startsWith('PT_');
}
