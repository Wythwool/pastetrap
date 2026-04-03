import { normalizeWhitespace, truncate } from '@/shared/utils/text';

const urlPattern = /https?:\/\/[^\s"')]+/gi;
const base64Pattern = /\b[A-Za-z0-9+/]{48,}={0,2}\b/g;
const quotedBlobPattern = /(['"])([^'"]{48,})\1/g;

export function sanitizePreview(value: string): string {
  const normalized = normalizeWhitespace(value)
    .replace(urlPattern, (match) => {
      try {
        const parsed = new URL(match);
        return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
      } catch {
        return '[url]';
      }
    })
    .replace(base64Pattern, (match) => `[blob:${match.length}]`)
    .replace(quotedBlobPattern, (_match, quote: string, content: string) => `${quote}[blob:${content.length}]${quote}`);

  return truncate(normalized, 180);
}

export function sanitizeEvidence(values: string[]): string[] {
  return values.map((value) => sanitizePreview(value)).filter(Boolean);
}
