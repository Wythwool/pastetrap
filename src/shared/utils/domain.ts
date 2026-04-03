export function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^\.+/, '').replace(/\.$/, '');
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
    return `${parsed.origin}${parsed.pathname}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export function isTrustedDomain(domain: string, trustedDomains: string[]): boolean {
  const normalizedDomain = normalizeDomain(domain);

  return trustedDomains.some((entry) => {
    const normalizedEntry = normalizeDomain(entry);
    return normalizedDomain === normalizedEntry || normalizedDomain.endsWith(`.${normalizedEntry}`);
  });
}
