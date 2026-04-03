import type { CommandCandidate, CommandIndicator, CommandPlatform, PageSnapshot } from '@/shared/types';
import { sanitizePreview } from '@/shared/detection/sanitize';
import { createId } from '@/shared/utils/id';
import { hashText } from '@/shared/utils/hash';
import { normalizeWhitespace, uniqueStrings } from '@/shared/utils/text';

const inlineCommandPattern =
  /(?:powershell(?:\.exe)?\s+[^\n]+|cmd(?:\.exe)?\s+\/c\s+[^\n]+|(?:curl|wget)\s+[^\n]{0,220}|(?:bash|sh|zsh)\s+-c\s+[^\n]+|osascript\s+[^\n]+|mshta\s+[^\n]+|rundll32\s+[^\n]+)/gi;

const indicatorMatchers: Array<{ id: string; tag: string; pattern: RegExp }> = [
  { id: 'powershell-encoded', tag: 'encoded', pattern: /(?:-enc\b|-encodedcommand\b)/i },
  { id: 'iex', tag: 'iex', pattern: /\b(?:iex|invoke-expression)\b/i },
  { id: 'iwr-irm', tag: 'download', pattern: /\b(?:iwr|invoke-webrequest|irm|invoke-restmethod)\b/i },
  { id: 'start-process', tag: 'execute', pattern: /\bstart-process\b/i },
  { id: 'cmd-c', tag: 'cmd', pattern: /\bcmd(?:\.exe)?\s+\/c\b/i },
  { id: 'mshta', tag: 'lolbin', pattern: /\bmshta\b/i },
  { id: 'rundll32', tag: 'lolbin', pattern: /\brundll32\b/i },
  { id: 'regsvr32', tag: 'lolbin', pattern: /\bregsvr32\b/i },
  { id: 'certutil', tag: 'lolbin', pattern: /\bcertutil\b/i },
  { id: 'bitsadmin', tag: 'lolbin', pattern: /\bbitsadmin\b/i },
  { id: 'schtasks', tag: 'persistence', pattern: /\bschtasks\b/i },
  { id: 'curl-pipe-bash', tag: 'pipe-shell', pattern: /\bcurl\b[^\n|]*\|\s*(?:bash|sh|zsh)\b/i },
  { id: 'wget-pipe-shell', tag: 'pipe-shell', pattern: /\bwget\b[^\n|]*\|\s*(?:bash|sh|zsh)\b/i },
  { id: 'bash-c', tag: 'shell-c', pattern: /\b(?:bash|sh|zsh)\s+-c\b/i },
  { id: 'osascript', tag: 'osascript', pattern: /\bosascript\b/i },
  { id: 'chmod-execute', tag: 'temp-exec', pattern: /\bchmod\s+\+x\b[\s\S]{0,80}(?:&&|;)\s*\.?\//i },
  { id: 'temp-path', tag: 'temp', pattern: /(?:\/tmp\/|%temp%|appdata\\local\\temp|mktemp)/i },
  { id: 'remote-url', tag: 'url', pattern: /https?:\/\/[^\s"')]+/i },
  { id: 'from-base64', tag: 'base64', pattern: /frombase64string/i },
  { id: 'long-base64', tag: 'base64', pattern: /\b[A-Za-z0-9+/]{64,}={0,2}\b/ },
  { id: 'backtick-obfuscation', tag: 'obfuscation', pattern: /`[A-Za-z]/ },
  { id: 'char-join', tag: 'obfuscation', pattern: /(?:-join|\[char\]|\$\()|\\x[0-9a-f]{2}/i }
];

function classifyPlatform(command: string): CommandPlatform {
  if (/\b(?:powershell|cmd(?:\.exe)?|mshta|rundll32|regsvr32|certutil|bitsadmin|schtasks)\b/i.test(command)) {
    return 'windows';
  }

  if (/\bosascript\b/i.test(command)) {
    return 'macos';
  }

  if (/\b(?:bash|sh|zsh|chmod|curl|wget)\b/i.test(command)) {
    return 'unix';
  }

  return 'unknown';
}

function findIndicators(command: string): CommandIndicator[] {
  return indicatorMatchers
    .filter(({ pattern }) => pattern.test(command))
    .map(({ id, tag, pattern }) => {
      const match = command.match(pattern)?.[0] ?? tag;
      return { id, tag, evidence: sanitizePreview(match) };
    });
}

function createCandidate(raw: string, source: CommandCandidate['source']): CommandCandidate | null {
  const normalized = normalizeWhitespace(raw);
  if (normalized.length < 12) {
    return null;
  }

  const indicators = findIndicators(normalized);
  if (indicators.length === 0 && !/\b(?:powershell|cmd|terminal|bash|sh|zsh|osascript|curl|wget)\b/i.test(normalized)) {
    return null;
  }

  return {
    id: createId('cmd', normalized),
    raw,
    normalized,
    preview: sanitizePreview(normalized),
    fingerprint: hashText(normalized),
    tokens: normalized.split(/\s+/).slice(0, 40),
    platform: classifyPlatform(normalized),
    source,
    indicators
  };
}

export function extractCommandCandidates(snapshot: PageSnapshot): CommandCandidate[] {
  const inlineMatches = Array.from(snapshot.bodyText.matchAll(inlineCommandPattern), (match) => match[0]);

  const rawCandidates = uniqueStrings([
    ...snapshot.codeBlocks,
    ...snapshot.copyCommandPairs,
    ...inlineMatches
  ]);

  const candidates: CommandCandidate[] = [];
  const seenFingerprints = new Set<string>();

  for (const rawCandidate of rawCandidates) {
    const source = snapshot.copyCommandPairs.includes(rawCandidate)
      ? 'copy-neighbor'
      : snapshot.codeBlocks.includes(rawCandidate)
        ? 'code-block'
        : 'inline';

    const candidate = createCandidate(rawCandidate, source);
    if (!candidate || seenFingerprints.has(candidate.fingerprint)) {
      continue;
    }

    seenFingerprints.add(candidate.fingerprint);
    candidates.push(candidate);
  }

  return candidates;
}
