import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppSettings, LatestTabState } from '@/shared/types';
import { saveSettings } from '@/shared/storage/settingsStore';

const settingsState: AppSettings = {
  sensitivity: 'balanced',
  language: 'en',
  enabledCategories: {
    'page-social-engineering': true,
    'terminal-invocation': true,
    'clipboard-bait': true,
    'fake-verification': true,
    'dom-cluster': true,
    'command-primitive': true,
    'download-execute': true,
    obfuscation: true,
    'platform-specific': true
  },
  trustedDomains: [],
  logLimit: 200
};

const latestStates = new Map<number, LatestTabState>();
const sessionIgnores = new Set<string>();
const logs: unknown[] = [];

vi.mock('@/shared/storage/settingsStore', () => ({
  getSettings: vi.fn(async () => settingsState),
  saveSettings: vi.fn(async (next: AppSettings) => next),
  defaultSettings: settingsState
}));

vi.mock('@/shared/storage/sessionStore', () => ({
  addSessionIgnore: vi.fn(async (key: string) => {
    sessionIgnores.add(key);
    return [...sessionIgnores];
  }),
  clearSessionIgnores: vi.fn(async () => {
    sessionIgnores.clear();
  }),
  getLatestState: vi.fn(async (tabId: number) => latestStates.get(tabId) ?? null),
  getSessionIgnores: vi.fn(async () => [...sessionIgnores]),
  saveLatestState: vi.fn(async (state: LatestTabState) => {
    latestStates.set(state.tabId, state);
  })
}));

vi.mock('@/shared/storage/logsStore', () => ({
  addLogEntry: vi.fn(async (entry: unknown) => {
    logs.unshift(entry);
    return logs;
  }),
  clearLogs: vi.fn(async () => {
    logs.length = 0;
  }),
  getLogs: vi.fn(async () => logs)
}));

vi.mock('@/shared/utils/browser', () => ({
  getExtensionApi: vi.fn(() => ({
    runtime: {
      getManifest: () => ({ version: '0.1.0' }),
      lastError: null
    },
    tabs: {
      sendMessage: (_tabId: number, _message: unknown, callback: () => void) => callback()
    }
  }))
}));

import { handleRuntimeMessage } from '@/background/runtimeRouter';

describe('handleRuntimeMessage', () => {
  beforeEach(() => {
    latestStates.clear();
    sessionIgnores.clear();
    logs.length = 0;
    settingsState.trustedDomains = [];
  });

  it('returns settings with session ignores', async () => {
    sessionIgnores.add('https://example.test/a');
    const response = await handleRuntimeMessage({ type: 'PT_GET_SETTINGS' }, {});
    expect(response.settings.language).toBe('en');
    expect(response.sessionIgnores).toEqual(['https://example.test/a']);
  });

  it('normalizes domains when trusting a site', async () => {
    await handleRuntimeMessage({ type: 'PT_TRUST_DOMAIN', domain: 'Docs.Example.org' }, {});
    expect(saveSettings).toHaveBeenCalledWith(expect.objectContaining({ trustedDomains: ['docs.example.org'] }));
  });

  it('stores an ignore entry for the current session', async () => {
    await handleRuntimeMessage({ type: 'PT_IGNORE_PAGE', pageKey: 'https://evil.test/drop' }, {});
    const response = await handleRuntimeMessage({ type: 'PT_GET_SESSION_IGNORES' }, {});
    expect(response.sessionIgnores).toEqual(['https://evil.test/drop']);
  });
});
