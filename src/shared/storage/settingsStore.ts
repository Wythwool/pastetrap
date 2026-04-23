import type { AppSettings } from '@/shared/types';
import { storageGet, storageSet } from '@/shared/storage/browserStorage';
import { defaultSettings, normalizeSettings } from '@/shared/settings/schema';

const settingsKey = 'settings';

export {
  allCategories,
  createTrustedSiteRule,
  defaultSettings,
  normalizeSettings,
  settingsSchemaVersion,
  upsertTrustedSiteRule
} from '@/shared/settings/schema';

export async function getSettings(): Promise<AppSettings> {
  const stored = await storageGet<unknown>('local', settingsKey, null);
  const normalized = normalizeSettings(stored);

  if (!stored || JSON.stringify(stored) !== JSON.stringify(normalized)) {
    await storageSet('local', settingsKey, normalized);
  }

  return normalized;
}

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
  const normalized = normalizeSettings(settings);
  await storageSet('local', settingsKey, normalized);
  return normalized;
}
