import type { CommandCandidate, CommandIndicator, CommandPlatform, PageSnapshot } from '@/shared/types';
import { sanitizePreview } from '@/shared/detection/sanitize';
import { createId } from '@/shared/utils/id';
import { hashText } from '@/shared/utils/hash';
import { normalizeWhitespace, uniqueStrings } from '@/shared/utils/text';

function pattern(source: string, flags = 'i'): RegExp {
  return new RegExp(source, flags);
}

const whitespacePattern = pattern(String.raw`\s+`, 'g');
const inlineCommandPattern = pattern(
  String.raw`(?:powershell(?:\.exe)?\s+[^\n]{0,900}|pwsh\s+[^\n]{0,900}|cmd(?:\.exe)?\s+\/c\s+[^\n]{0,900}|(?:curl|wget)\s+[^\n]{0,900}|(?:bash|sh|zsh)\s+-c\s+[^\n]{0,900}|osascript\s+[^\n]{0,900}|mshta\s+[^\n]{0,900}|rundll32\s+[^\n]{0,900}|regsvr32\s+[^\n]{0,900}|certutil\s+[^\n]{0,900}|bitsadmin\s+[^\n]{0,900}|python(?:3)?\s+[^\n]{0,900}|perl\s+[^\n]{0,900})`,
  'gi'
);
const commandNamePattern = pattern(
  String.raw`\b(?:powershell|pwsh|cmd(?:\.exe)?|terminal|bash|sh|zsh|osascript|curl|wget|mshta|rundll32|regsvr32|certutil|bitsadmin|schtasks|wmic|python3?|perl|launchctl)\b`,
  'i'
);

const indicatorMatchers: Array<{ id: string; tag: string; pattern: RegExp }> = [
  { id: 'powershell-encoded', tag: 'encoded', pattern: pattern(String.raw`(?:-enc\b|-encodedcommand\b)`) },
  { id: 'powershell-hidden', tag: 'stealth', pattern: pattern(String.raw`-(?:w|windowstyle)\s+hidden|-nop\b|-noprofile\b|-executionpolicy\s+bypass`) },
  { id: 'iex', tag: 'execute', pattern: pattern(String.raw`\b(?:iex|invoke-expression)\b`) },
  { id: 'iwr-irm', tag: 'download', pattern: pattern(String.raw`\b(?:iwr|invoke-webrequest|irm|invoke-restmethod)\b`) },
  { id: 'download-string', tag: 'download', pattern: pattern(String.raw`downloadstring|downloadfile|webclient`) },
  { id: 'start-process', tag: 'execute', pattern: pattern(String.raw`\bstart-process\b`) },
  { id: 'cmd-c', tag: 'cmd', pattern: pattern(String.raw`\bcmd(?:\.exe)?\s+\/c\b`) },
  { id: 'mshta', tag: 'lolbin', pattern: pattern(String.raw`\bmshta\b`) },
  { id: 'rundll32', tag: 'lolbin', pattern: pattern(String.raw`\brundll32\b`) },
  { id: 'regsvr32', tag: 'lolbin', pattern: pattern(String.raw`\bregsvr32\b`) },
  { id: 'certutil', tag: 'lolbin', pattern: pattern(String.raw`\bcertutil\b`) },
  { id: 'bitsadmin', tag: 'lolbin', pattern: pattern(String.raw`\bbitsadmin\b`) },
  { id: 'schtasks', tag: 'persistence', pattern: pattern(String.raw`\bschtasks\b`) },
  { id: 'wmic', tag: 'lolbin', pattern: pattern(String.raw`\bwmic\b`) },
  { id: 'curl-pipe-bash', tag: 'pipe-shell', pattern: pattern(String.raw`\bcurl\b[\s\S]{0,240}\|\s*(?:bash|sh|zsh)\b`) },
  { id: 'wget-pipe-shell', tag: 'pipe-shell', pattern: pattern(String.raw`\bwget\b[\s\S]{0,240}\|\s*(?:bash|sh|zsh)\b`) },
  { id: 'remote-shell-wrapper', tag: 'shell-wrapper', pattern: pattern(String.raw`(?:bash|sh|zsh)\s+-c\s+['"][\s\S]{0,240}https?:\/\/`) },
  { id: 'bash-c', tag: 'shell-c', pattern: pattern(String.raw`\b(?:bash|sh|zsh)\s+-c\b`) },
  { id: 'python-remote-exec', tag: 'python-exec', pattern: pattern(String.raw`\bpython(?:3)?\b[\s\S]{0,220}(?:urllib|requests|exec\(|subprocess|os\.system|https?:\/\/)`) },
  { id: 'perl-remote-exec', tag: 'perl-exec', pattern: pattern(String.raw`\bperl\b[\s\S]{0,220}(?:LWP::|IO::Socket|system\(|exec\(|https?:\/\/)`) },
  { id: 'osascript', tag: 'osascript', pattern: pattern(String.raw`\bosascript\b`) },
  { id: 'launchctl', tag: 'persistence', pattern: pattern(String.raw`\blaunchctl\b`) },
  { id: 'chmod-execute', tag: 'temp-exec', pattern: pattern(String.raw`\bchmod\s+\+x\b[\s\S]{0,120}(?:&&|;|\n)\s*\.?\/?`) },
  { id: 'temp-path', tag: 'temp', pattern: pattern(String.raw`(?:\/tmp\/|\/var\/tmp\/|%temp%|appdata\\local\\temp|mktemp|\$env:temp)`) },
  { id: 'download-to-file', tag: 'download', pattern: pattern(String.raw`(?:-o\s+|--output\s+|outfile\s+|out-file|>\s*\/?(?:tmp|var)|-out\s+)`) },
  { id: 'remote-url', tag: 'url', pattern: pattern(String.raw`https?:\/\/[^\s"')<>]+`) },
  { id: 'short-url', tag: 'url', pattern: pattern(String.raw`https?:\/\/(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|cutt\.ly|rb\.gy)\/`) },
  { id: 'from-base64', tag: 'base64', pattern: pattern(String.raw`frombase64string|base64\s+-d|certutil\s+-decode`) },
  { id: 'long-base64', tag: 'base64', pattern: pattern(String.raw`\b[A-Za-z0-9+/]{72,}={0,2}\b`) },
  { id: 'backtick-obfuscation', tag: 'obfuscation', pattern: pattern('`[A-Za-z]') },
  { id: 'char-join', tag: 'obfuscation', pattern: pattern(String.raw`(?:-join|\[char\]|\$\(|\\x[0-9a-f]{2}|%[A-Fa-f0-9]{2})`) },
  { id: 'env-var-expansion', tag: 'obfuscation', pattern: pattern(String.raw`(?:\$env:|%[a-z_]+%|\$\{[^}]+\})`) },
  { id: 'shell-chain', tag: 'chain', pattern: pattern(String.raw`(?:&&|;|\|\||\|)[\s\S]{0,120}\b(?:powershell|pwsh|cmd|bash|sh|zsh|python|perl|osascript|chmod|curl|wget)\b`) }
];

function classifyPlatform(command: string): CommandPlatform {
  if (pattern(String.raw`\b(?:powershell|pwsh|cmd(?:\.exe)?|mshta|rundll32|regsvr32|certutil|bitsadmin|schtasks|wmic)\b`).test(command)) {
    return 'windows';
  }

  if (pattern(String.raw`\b(?:osascript|launchctl)\b`).test(command)) {
    return 'macos';
  }

  if (pattern(String.raw`\b(?:bash|sh|zsh|chmod|curl|wget|python3?|perl)\b`).test(command)) {
    return 'unix';
  }

  return 'unknown';
}

function findIndicators(command: string): CommandIndicator[] {
  return indicatorMatchers
    .filter(({ pattern: matcher }) => matcher.test(command))
    .map(({ id, tag, pattern: matcher }) => {
      const match = command.match(matcher)?.[0] ?? tag;
      return { id, tag, evidence: sanitizePreview(match) };
    });
}

function splitCommandishFragments(value: string): string[] {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return [];
  }

  const inline = Array.from(normalized.matchAll(inlineCommandPattern), (match) => match[0]);
  inlineCommandPattern.lastIndex = 0;
  return inline.length > 0 ? inline : [normalized];
}

function createCandidate(raw: string, source: CommandCandidate['source']): CommandCandidate | null {
  const normalized = normalizeWhitespace(raw);
  if (normalized.length < 12) {
    return null;
  }

  const indicators = findIndicators(normalized);
  if (indicators.length === 0 && !commandNamePattern.test(normalized)) {
    return null;
  }

  return {
    id: createId('cmd', `${source}:${normalized}`),
    raw,
    normalized,
    preview: sanitizePreview(normalized),
    fingerprint: hashText(normalized.toLowerCase()),
    tokens: normalized.split(whitespacePattern).slice(0, 60),
    platform: classifyPlatform(normalized),
    source,
    indicators
  };
}

function addCandidates(
  candidates: CommandCandidate[],
  seenFingerprints: Set<string>,
  values: string[],
  source: CommandCandidate['source']
): void {
  for (const value of uniqueStrings(values)) {
    for (const fragment of splitCommandishFragments(value)) {
      const candidate = createCandidate(fragment, source);
      if (!candidate || seenFingerprints.has(candidate.fingerprint)) {
        continue;
      }

      seenFingerprints.add(candidate.fingerprint);
      candidates.push(candidate);
    }
  }
}

export function extractCommandCandidates(snapshot: PageSnapshot): CommandCandidate[] {
  const candidates: CommandCandidate[] = [];
  const seenFingerprints = new Set<string>();
  const inlineText = [snapshot.bodyText, ...(snapshot.shadowText ?? []), ...snapshot.suspiciousContainers, ...snapshot.dataAttributes].join(' ');
  const inlineMatches = Array.from(inlineText.matchAll(inlineCommandPattern), (match) => match[0]);
  inlineCommandPattern.lastIndex = 0;

  addCandidates(candidates, seenFingerprints, snapshot.codeBlocks, 'code-block');
  addCandidates(candidates, seenFingerprints, snapshot.copyCommandPairs, 'copy-neighbor');
  addCandidates(candidates, seenFingerprints, snapshot.clipboardPayloads ?? [], 'clipboard-payload');
  addCandidates(candidates, seenFingerprints, [...snapshot.dataAttributes, ...snapshot.ariaLabels], 'attribute');
  addCandidates(candidates, seenFingerprints, inlineMatches, 'inline');

  return candidates;
}
