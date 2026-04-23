import type { AppSettings, DetectionCategory, Language, SensitivityProfile, SuppressRule, TrustedSiteRule } from '@/shared/types';
import { createId } from '@/shared/utils/id';
import { normalizeDomain, normalizePathPrefix } from '@/shared/utils/domain';

export const settingsSchemaVersion = 2;

export const allCategories: DetectionCategory[] = [
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

const defaultEnabledCategories = Object.fromEntries(
  allCategories.map((category) => [category, true])
) as Record<DetectionCategory, boolean>;

export const defaultSettings: AppSettings = {
  schemaVersion: settingsSchemaVersion,
  sensitivity: 'balanced',
  language: 'en',
  enabledCategories: defaultEnabledCategories,
  trustedDomains: [],
  trustedSites: [],
  suppressRules: [],
  logLimit: 200
};

const sensitivities = new Set<SensitivityProfile>(['low', 'balanced', 'strict']);
const languages = new Set<Language>(['en', 'ru']);
const categorySet = new Set<DetectionCategory>(allCategories);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneDefaultSettings(): AppSettings {
  return {
    ...defaultSettings,
    enabledCategories: { ...defaultSettings.enabledCategories },
    trustedDomains: [],
    trustedSites: [],
    suppressRules: []
  };
}

function clampInteger(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.trunc(parsed))) : fallback;
}

function normalizeSensitivity(value: unknown): SensitivityProfile {
  return typeof value === 'string' && sensitivities.has(value as SensitivityProfile)
    ? (value as SensitivityProfile)
    : defaultSettings.sensitivity;
}

function normalizeLanguage(value: unknown): Language {
  return typeof value === 'string' && languages.has(value as Language) ? (value as Language) : defaultSettings.language;
}

function normalizeEnabledCategories(value: unknown): Record<DetectionCategory, boolean> {
  const next = { ...defaultSettings.enabledCategories };
  if (!isRecord(value)) {
    return next;
  }

  for (const category of allCategories) {
    if (typeof value[category] === 'boolean') {
      next[category] = value[category];
    }
  }

  return next;
}

function normalizeTrustedDomains(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((entry) => (typeof entry === 'string' ? normalizeDomain(entry) : '')).filter(Boolean))];
}

function normalizeTrustedSiteRule(value: unknown): TrustedSiteRule | null {
  if (!isRecord(value)) {
    return null;
  }

  const host = normalizeDomain(typeof value.host === 'string' ? value.host : '');
  if (!host) {
    return null;
  }

  const pathPrefix = normalizePathPrefix(typeof value.pathPrefix === 'string' ? value.pathPrefix : '/');
  const includeSubdomains = typeof value.includeSubdomains === 'boolean' ? value.includeSubdomains : false;
  const createdAt = typeof value.createdAt === 'string' && value.createdAt ? value.createdAt : new Date().toISOString();
  const id = typeof value.id === 'string' && value.id ? value.id : createId('trust', `${host}:${pathPrefix}:${includeSubdomains}`);
  const note = typeof value.note === 'string' && value.note.trim() ? value.note.trim().slice(0, 160) : '';
  const rule: TrustedSiteRule = { id, host, pathPrefix, includeSubdomains, createdAt };

  if (note) {
    rule.note = note;
  }

  return rule;
}

function trustedRuleKey(rule: TrustedSiteRule): string {
  return `${rule.host}\n${rule.pathPrefix}\n${String(rule.includeSubdomains)}`;
}

function normalizeTrustedSites(value: unknown, legacyDomains: string[]): TrustedSiteRule[] {
  const normalized = new Map<string, TrustedSiteRule>();

  for (const host of legacyDomains) {
    const rule: TrustedSiteRule = {
      id: createId('trust', `${host}:/:false`),
      host,
      pathPrefix: '/',
      includeSubdomains: false,
      createdAt: new Date().toISOString()
    };
    normalized.set(trustedRuleKey(rule), rule);
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const rule = normalizeTrustedSiteRule(entry);
      if (rule) {
        normalized.set(trustedRuleKey(rule), rule);
      }
    }
  }

  return [...normalized.values()].sort((left, right) => left.host.localeCompare(right.host));
}

function normalizeSuppressRule(value: unknown): SuppressRule | null {
  if (!isRecord(value)) {
    return null;
  }

  const host = normalizeDomain(typeof value.host === 'string' ? value.host : '');
  const category = typeof value.category === 'string' ? (value.category as DetectionCategory) : null;
  if (!host || !category || !categorySet.has(category)) {
    return null;
  }

  const pathPrefix = normalizePathPrefix(typeof value.pathPrefix === 'string' ? value.pathPrefix : '/');
  const createdAt = typeof value.createdAt === 'string' && value.createdAt ? value.createdAt : new Date().toISOString();
  const id = typeof value.id === 'string' && value.id ? value.id : createId('suppress', `${host}:${pathPrefix}:${category}`);

  return { id, host, pathPrefix, category, createdAt };
}

function normalizeSuppressRules(value: unknown): SuppressRule[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const rules = new Map<string, SuppressRule>();
  for (const entry of value) {
    const rule = normalizeSuppressRule(entry);
    if (rule) {
      rules.set(`${rule.host}\n${rule.pathPrefix}\n${rule.category}`, rule);
    }
  }

  return [...rules.values()].sort((left, right) => left.host.localeCompare(right.host));
}

export function normalizeSettings(raw: unknown): AppSettings {
  if (!isRecord(raw)) {
    return cloneDefaultSettings();
  }

  const trustedDomains = normalizeTrustedDomains(raw.trustedDomains);
  const trustedSites = normalizeTrustedSites(raw.trustedSites, trustedDomains);

  return {
    schemaVersion: settingsSchemaVersion,
    sensitivity: normalizeSensitivity(raw.sensitivity),
    language: normalizeLanguage(raw.language),
    enabledCategories: normalizeEnabledCategories(raw.enabledCategories),
    trustedDomains: trustedSites
      .filter((rule) => rule.pathPrefix === '/' && !rule.includeSubdomains)
      .map((rule) => rule.host),
    trustedSites,
    suppressRules: normalizeSuppressRules(raw.suppressRules),
    logLimit: clampInteger(raw.logLimit, defaultSettings.logLimit, 25, 2000)
  };
}

export function createTrustedSiteRule(urlOrHost: string, scope: 'host' | 'path', includeSubdomains = false): TrustedSiteRule | null {
  const raw = urlOrHost.trim();
  if (!raw) {
    return null;
  }

  let host = '';
  let pathPrefix = '/';

  try {
    const parsed = new URL(raw.includes('://') ? raw : `https://${raw}`);
    host = normalizeDomain(parsed.hostname);
    pathPrefix = scope === 'path' ? normalizePathPrefix(parsed.pathname) : '/';
  } catch {
    host = normalizeDomain(raw);
  }

  if (!host) {
    return null;
  }

  return {
    id: createId('trust', `${host}:${pathPrefix}:${includeSubdomains}`),
    host,
    pathPrefix,
    includeSubdomains,
    createdAt: new Date().toISOString()
  };
}

export function upsertTrustedSiteRule(settings: AppSettings, rule: TrustedSiteRule): AppSettings {
  const nextRules = new Map(settings.trustedSites.map((entry) => [trustedRuleKey(entry), entry]));
  nextRules.set(trustedRuleKey(rule), rule);
  return normalizeSettings({ ...settings, trustedSites: [...nextRules.values()] });
}
