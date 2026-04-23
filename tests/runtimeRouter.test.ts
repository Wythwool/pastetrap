import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppSettings, LatestTabState } from '@/shared/types';

const settingsState: AppSettings = {
  schemaVersion: 2,
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
  trustedSites: [],
  suppressRules: [],
  logLimit: 200
};

const latestStates = new Map<number, LatestTabState>();
const sessionIgnores = new Set<string>();
const logs: unknown[] = [];

function makeTrustedRule(urlOrHost: string, scope: 'host' | 'path', includeSubdomains = false) {
  const parsed = new URL(urlOrHost.includes('://') ? urlOrHost : `https://${urlOrHost}`);
  const host = parsed.hostname.toLowerCase();
  const pathPrefix = scope === 'path' ? parsed.pathname || '/' : '/';
  return {
    id: `trust_${host}_${pathPrefix}_${includeSubdomains}`,
    host,
    pathPrefix,
    includeSubdomains,
    createdAt: '2026-04-22T00:00:00.000Z'
  };
}

vi.mock('@/shared/storage/settingsStore', () => ({
  getSettings: vi.fn(async () => settingsState),
  saveSettings: vi.fn(async (next: AppSettings) => {
    Object.assign(settingsState, next);
    return settingsState;
  }),
  createTrustedSiteRule: vi.fn(makeTrustedRule),
  upsertTrustedSiteRule: vi.fn((settings: AppSettings, rule: AppSettings['trustedSites'][number]) => ({
    ...settings,
    trustedSites: [...settings.trustedSites.filter((entry) => entry.id !== rule.id), rule]
  })),
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
      getManifest: () => ({ version: '0.2.0' }),
      lastError: null
    },
    tabs: {
      sendMessage: (_tabId: number, _message: unknown, callback: (response: unknown) => void) => callback({
        ok: true,
        scanId: 'scan_1',
        updatedAt: '2026-04-22T00:00:00.000Z',
        fingerprint: 'fp',
        level: 'high'
      })
    }
  }))
}));

import { handleRuntimeMessage } from '@/background/runtimeRouter';
import { saveSettings } from '@/shared/storage/settingsStore';

describe('handleRuntimeMessage', () => {
  beforeEach(() => {
    latestStates.clear();
    sessionIgnores.clear();
    logs.length = 0;
    settingsState.trustedDomains = [];
    settingsState.trustedSites = [];
    settingsState.suppressRules = [];
    vi.clearAllMocks();
  });

  it('returns settings with session ignores', async () => {
    sessionIgnores.add('https://example.test/a');
    const response = await handleRuntimeMessage({ type: 'PT_GET_SETTINGS' }, {});
    expect(response.settings.language).toBe('en');
    expect(response.sessionIgnores).toEqual(['https://example.test/a']);
  });

  it('normalizes domains when trusting a legacy domain', async () => {
    await handleRuntimeMessage({ type: 'PT_TRUST_DOMAIN', domain: 'Docs.Example.org' }, {});
    expect(saveSettings).toHaveBeenCalledWith(expect.objectContaining({
      trustedDomains: ['docs.example.org'],
      trustedSites: [expect.objectContaining({ host: 'docs.example.org', pathPrefix: '/', includeSubdomains: false })]
    }));
  });

  it('stores a granular host trust rule', async () => {
    const response = await handleRuntimeMessage({ type: 'PT_TRUST_SITE', url: 'https://docs.example.org/install', scope: 'path' }, {});
    expect(response.settings.trustedSites[0]).toEqual(expect.objectContaining({ host: 'docs.example.org', pathPrefix: '/install' }));
  });

  it('waits for content scan before returning popup rescan state', async () => {
    const state = {
      tabId: 7,
      url: 'https://evil.test/',
      domain: 'evil.test',
      updatedAt: '2026-04-22T00:00:00.000Z',
      result: {
        scanId: 'scan_1',
        timestamp: '2026-04-22T00:00:00.000Z',
        url: 'https://evil.test/',
        domain: 'evil.test',
        title: 'Fake',
        source: 'popup-action',
        trusted: false,
        ignored: false,
        score: 80,
        level: 'high',
        headlineRuleId: 'fake-verification-language',
        summaryKey: 'summary.high',
        explanationKey: 'explanation.high',
        fingerprint: 'fp',
        matchedRules: [],
        commands: [],
        scoringTrace: []
      }
    } satisfies LatestTabState;
    latestStates.set(7, state);

    const response = await handleRuntimeMessage({ type: 'PT_RESCAN_TAB', tabId: 7 }, {});
    expect(response.scan?.scanId).toBe('scan_1');
    expect(response.state?.result.fingerprint).toBe('fp');
  });

  it('stores an ignore entry for the current session', async () => {
    await handleRuntimeMessage({ type: 'PT_IGNORE_PAGE', pageKey: 'https://evil.test/drop?x=1' }, {});
    const response = await handleRuntimeMessage({ type: 'PT_GET_SESSION_IGNORES' }, {});
    expect(response.sessionIgnores).toEqual(['https://evil.test/drop?x=1']);
  });
});
