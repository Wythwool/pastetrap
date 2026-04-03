import type { AppSettings, DetectionCategory } from '@/shared/types';
import { storageGet, storageSet } from '@/shared/storage/browserStorage';

const settingsKey = 'settings';

const allCategories: DetectionCategory[] = [
  'page-social-engineering',
  'terminal-invocation',
  'clipboard-bait',
  'fake-verification',
  'dom-cluster',
  'command-primitive',
  'download-execute',
  'obfuscation',
  'platform-specific'
];

export const defaultSettings: AppSettings = {
  sensitivity: 'balanced',
  language: 'en',
  enabledCategories: Object.fromEntries(allCategories.map((category) => [category, true])) as AppSettings['enabledCategories'],
  trustedDomains: [],
  logLimit: 200
};

export async function getSettings(): Promise<AppSettings> {
  const stored = await storageGet<AppSettings | null>('local', settingsKey, null);
  if (!stored) {
    await storageSet('local', settingsKey, defaultSettings);
    return defaultSettings;
  }

  return {
    ...defaultSettings,
    ...stored,
    enabledCategories: {
      ...defaultSettings.enabledCategories,
      ...stored.enabledCategories
    },
    trustedDomains: [...new Set(stored.trustedDomains.map((domain) => domain.toLowerCase()))]
  };
}

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
  const normalized: AppSettings = {
    ...settings,
    trustedDomains: [...new Set(settings.trustedDomains.map((domain) => domain.toLowerCase().trim()).filter(Boolean))]
  };

  await storageSet('local', settingsKey, normalized);
  return normalized;
}
