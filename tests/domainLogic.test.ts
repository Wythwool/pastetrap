import { describe, expect, it } from 'vitest';
import { createPageKey, isTrustedDomain } from '@/shared/utils/domain';

describe('domain trust helpers', () => {
  it('matches exact domains and subdomains', () => {
    expect(isTrustedDomain('docs.example.org', ['example.org'])).toBe(true);
    expect(isTrustedDomain('evil-example.org', ['example.org'])).toBe(false);
  });

  it('builds stable page keys without query strings', () => {
    expect(createPageKey('https://example.org/path/file?x=1#fragment')).toBe('https://example.org/path/file');
  });
});
