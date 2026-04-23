import type { AppSettings, DetectionCategory, SuppressRule, TrustedSiteRule } from '@/shared/types';

export function normalizeDomain(domain: string): string {
  const trimmed = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  return trimmed.replace(/:\d+$/, '').replace(/^\.+/, '').replace(/\.$/, '');
}

export function normalizePathPrefix(pathPrefix: string): string {
  const trimmed = pathPrefix.trim();
  if (!trimmed || trimmed === '*') {
    return '/';
  }

  const withoutHash = trimmed.split('#')[0] ?? '/';
  const withoutQuery = withoutHash.split('?')[0] ?? '/';
  const prefixed = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
  return prefixed.replace(/\/+/g, '/');
}

export function getDomainFromUrl(url: string): string {
  try {
    return normalizeDomain(new URL(url).hostname);
  } catch {
    return '';
  }
}

export function createPageKey(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}${parsed.search}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export function isTrustedDomain(domain: string, trustedDomains: string[]): boolean {
  const normalizedDomain = normalizeDomain(domain);
  return trustedDomains.some((entry) => normalizeDomain(entry) === normalizedDomain);
}

export function trustedRuleMatchesUrl(rule: TrustedSiteRule, url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = normalizeDomain(parsed.hostname);
    const ruleHost = normalizeDomain(rule.host);
    const hostMatches = rule.includeSubdomains ? host === ruleHost || host.endsWith(`.${ruleHost}`) : host === ruleHost;
    if (!hostMatches) {
      return false;
    }

    const path = normalizePathPrefix(parsed.pathname || '/');
    const prefix = normalizePathPrefix(rule.pathPrefix || '/');
    return prefix === '/' || path === prefix || path.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`);
  } catch {
    return false;
  }
}

export function getTrustedRuleForUrl(
  url: string,
  settings: Pick<AppSettings, 'trustedSites' | 'trustedDomains'>
): TrustedSiteRule | null {
  const match = settings.trustedSites.find((rule) => trustedRuleMatchesUrl(rule, url));
  if (match) {
    return match;
  }

  const domain = getDomainFromUrl(url);
  if (isTrustedDomain(domain, settings.trustedDomains)) {
    return { id: `legacy:${domain}`, host: domain, pathPrefix: '/', includeSubdomains: false, createdAt: '' };
  }

  return null;
}

export function isTrustedUrl(url: string, settings: Pick<AppSettings, 'trustedSites' | 'trustedDomains'>): boolean {
  return getTrustedRuleForUrl(url, settings) !== null;
}

export function describeTrustedRule(rule: TrustedSiteRule): string {
  const scope = rule.pathPrefix === '/' ? rule.host : `${rule.host}${rule.pathPrefix}`;
  return rule.includeSubdomains ? `${scope} (+subdomains)` : scope;
}

export function suppressRuleMatchesUrl(rule: SuppressRule, url: string, category?: DetectionCategory): boolean {
  if (category && rule.category !== category) {
    return false;
  }

  return trustedRuleMatchesUrl(
    {
      id: rule.id,
      host: rule.host,
      pathPrefix: rule.pathPrefix,
      includeSubdomains: false,
      createdAt: rule.createdAt
    },
    url
  );
}
