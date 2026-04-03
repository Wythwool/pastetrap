import { describe, expect, it } from 'vitest';
import { appendLogEntry } from '@/shared/utils/logs';
import type { LogEntry } from '@/shared/types';

function entry(id: string): LogEntry {
  return {
    id,
    timestamp: '2026-04-02T00:00:00.000Z',
    domain: 'example.org',
    url: 'https://example.org',
    pageTitle: 'Example',
    score: 10,
    riskLevel: 'low',
    matchedSignals: [],
    matchedRules: [],
    commandFingerprint: null,
    commandPreview: null,
    userAction: 'scan',
    sensitivityProfile: 'balanced',
    extensionVersion: '0.1.0',
    source: 'initial'
  };
}

describe('appendLogEntry', () => {
  it('keeps newest entries first and enforces a ring buffer limit', () => {
    const next = appendLogEntry([entry('a'), entry('b')], entry('c'), 2);
    expect(next.map((item) => item.id)).toEqual(['c', 'a']);
  });
});
