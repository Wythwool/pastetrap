import { describe, expect, it } from 'vitest';
import { createTrustedSiteRule, normalizeSettings, settingsSchemaVersion } from '@/shared/settings/schema';

const baseCategories = {
  'page-social-engineering': true,
  'terminal-invocation': true,
  'clipboard-bait': true,
  'fake-verification': true,
  'dom-cluster': true,
  'command-primitive': true,
  'download-execute': true,
  obfuscation: true,
  'platform-specific': true
};

describe('settings schema', () => {
  it('migrates legacy trusted domains to exact host rules', () => {
    const normalized = normalizeSettings({
      sensitivity: 'balanced',
      language: 'en',
      enabledCategories: baseCategories,
      trustedDomains: ['Example.org'],
      logLimit: 200
    });

    expect(normalized.schemaVersion).toBe(settingsSchemaVersion);
    expect(normalized.trustedDomains).toEqual(['example.org']);
    expect(normalized.trustedSites[0]).toEqual(expect.objectContaining({ host: 'example.org', pathPrefix: '/', includeSubdomains: false }));
  });

  it('clamps invalid primitive settings', () => {
    const normalized = normalizeSettings({ language: 'zz', sensitivity: 'panic', logLimit: 999999 });
    expect(normalized.language).toBe('en');
    expect(normalized.sensitivity).toBe('balanced');
    expect(normalized.logLimit).toBe(2000);
  });

  it('normalizes exact host and path trust rules', () => {
    const hostRule = createTrustedSiteRule('https://docs.example.org/install?x=1', 'host');
    const pathRule = createTrustedSiteRule('https://docs.example.org/install/setup?x=1', 'path');

    expect(hostRule).toEqual(expect.objectContaining({ host: 'docs.example.org', pathPrefix: '/' }));
    expect(pathRule).toEqual(expect.objectContaining({ host: 'docs.example.org', pathPrefix: '/install/setup' }));
  });

  it('drops invalid suppressions and preserves valid ones', () => {
    const normalized = normalizeSettings({
      suppressRules: [
        { host: 'docs.example.org', pathPrefix: '/install', category: 'fake-verification' },
        { host: '', pathPrefix: '/', category: 'fake-verification' },
        { host: 'docs.example.org', pathPrefix: '/', category: 'unknown' }
      ]
    });

    expect(normalized.suppressRules).toHaveLength(1);
    expect(normalized.suppressRules[0]).toEqual(expect.objectContaining({ host: 'docs.example.org', pathPrefix: '/install', category: 'fake-verification' }));
  });
});
