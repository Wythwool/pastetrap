const whitespacePattern = /\s+/g;
const zeroWidthPattern = /[\u200B-\u200D\uFEFF]/g;

export function normalizeWhitespace(value: string): string {
  return value.replace(zeroWidthPattern, '').replace(whitespacePattern, ' ').trim();
}

export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}...`;
}

export function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => normalizeWhitespace(value)).filter(Boolean))];
}

export function lowerIncludesAny(value: string, candidates: string[]): boolean {
  const lower = value.toLowerCase();
  return candidates.some((candidate) => lower.includes(candidate.toLowerCase()));
}
