import { describe, expect, it } from 'vitest';
import { createPageKey, isTrustedDomain, isTrustedUrl } from '@/shared/utils/domain';
import { createTrustedSiteRule } from '@/shared/settings/schema';
import type { AppSettings } from '@/shared/types';

function settingsWithTrustedSites(trustedSites: AppSettings['trustedSites']): Pick<AppSettings, 'trustedDomains' | 'trustedSites'> {
  return { trustedDomains: [], trustedSites };
}

describe('domain trust helpers', () => {
  it('keeps legacy domain trust exact-only', () => {
    expect(isTrustedDomain('example.org', ['example.org'])).toBe(true);
    expect(isTrustedDomain('docs.example.org', ['example.org'])).toBe(false);
    expect(isTrustedDomain('evil-example.org', ['example.org'])).toBe(false);
  });

  it('builds page keys with query strings but without fragments', () => {
    expect(createPageKey('https://example.org/path/file?x=1#fragment')).toBe('https://example.org/path/file?x=1');
  });

  it('matches trusted exact host and path rules', () => {
    const hostRule = createTrustedSiteRule('https://docs.example.org/install', 'host');
    const pathRule = createTrustedSiteRule('https://safe.example.org/docs/install', 'path');

    expect(hostRule).not.toBeNull();
    expect(pathRule).not.toBeNull();
    expect(isTrustedUrl('https://docs.example.org/anything', settingsWithTrustedSites([hostRule!]))).toBe(true);
    expect(isTrustedUrl('https://sub.docs.example.org/anything', settingsWithTrustedSites([hostRule!]))).toBe(false);
    expect(isTrustedUrl('https://safe.example.org/docs/install/step', settingsWithTrustedSites([pathRule!]))).toBe(true);
    expect(isTrustedUrl('https://safe.example.org/other', settingsWithTrustedSites([pathRule!]))).toBe(false);
  });
});
