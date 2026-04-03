import type { LogEntry } from '@/shared/types';
import { storageGet, storageSet } from '@/shared/storage/browserStorage';
import { appendLogEntry } from '@/shared/utils/logs';

const logsKey = 'logs';

export async function getLogs(): Promise<LogEntry[]> {
  return storageGet<LogEntry[]>('local', logsKey, []);
}

export async function addLogEntry(entry: LogEntry, limit: number): Promise<LogEntry[]> {
  const current = await getLogs();
  const next = appendLogEntry(current, entry, limit);
  await storageSet('local', logsKey, next);
  return next;
}

export async function clearLogs(): Promise<void> {
  await storageSet('local', logsKey, []);
}
