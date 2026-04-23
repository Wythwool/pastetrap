import type { LogEntry } from '@/shared/types';

export function appendLogEntry(entries: LogEntry[], nextEntry: LogEntry, limit: number): LogEntry[] {
  const filtered = entries.filter((entry) => entry.id !== nextEntry.id);
  filtered.unshift(nextEntry);
  return filtered.slice(0, limit);
}
