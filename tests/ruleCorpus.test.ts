import maliciousCorpus from './fixtures/rule-corpus/malicious.json';
import benignCorpus from './fixtures/rule-corpus/benign.json';
import { describe, expect, it } from 'vitest';
import { analyzePage } from '@/shared/detection/engine';
import { defaultSettings } from '@/shared/storage/settingsStore';
import type { PageSnapshot, RiskLevel } from '@/shared/types';

const levelRank: Record<RiskLevel, number> = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };

type CorpusEntry = {
  name: string;
  url: string;
  title: string;
  bodyText: string;
  codeBlocks?: string[];
  shadowText?: string[];
  clipboardPayloads?: string[];
  expectedMinimumLevel?: RiskLevel;
  expectedMaximumLevel?: RiskLevel;
  expectedRules: string[];
};

function snapshot(entry: CorpusEntry): PageSnapshot {
  return {
    url: entry.url,
    domain: new URL(entry.url).hostname,
    title: entry.title,
    metaDescription: entry.title,
    bodyText: entry.bodyText,
    buttons: ['Copy command', 'Verify'],
    links: [],
    codeBlocks: entry.codeBlocks ?? [],
    dialogs: [],
    ariaLabels: [],
    dataAttributes: [],
    suspiciousContainers: [entry.bodyText],
    copyCommandPairs: entry.codeBlocks ?? [],
    shadowText: entry.shadowText ?? [],
    iframeDescriptors: [],
    mediaDescriptors: [],
    clipboardPayloads: entry.clipboardPayloads ?? [],
    metrics: {
      copyLikeControls: entry.bodyText.includes('Copy') || entry.bodyText.includes('коп') ? 2 : 0,
      suspiciousContainers: 1,
      codeBlocks: entry.codeBlocks?.length ?? 0,
      dialogs: 0,
      shadowRoots: entry.shadowText?.length ?? 0
    }
  };
}

describe('rule regression corpus', () => {
  for (const entry of maliciousCorpus as CorpusEntry[]) {
    it(`detects ${entry.name}`, () => {
      const result = analyzePage(snapshot(entry), defaultSettings, 'initial');
      for (const ruleId of entry.expectedRules) {
        expect(result.matchedRules.map((rule) => rule.id)).toContain(ruleId);
      }
      expect(levelRank[result.level]).toBeGreaterThanOrEqual(levelRank[entry.expectedMinimumLevel ?? 'high']);
    });
  }

  for (const entry of benignCorpus as CorpusEntry[]) {
    it(`keeps ${entry.name} quiet`, () => {
      const result = analyzePage(snapshot(entry), defaultSettings, 'initial');
      for (const ruleId of entry.expectedRules) {
        expect(result.matchedRules.map((rule) => rule.id)).toContain(ruleId);
      }
      expect(levelRank[result.level]).toBeLessThanOrEqual(levelRank[entry.expectedMaximumLevel ?? 'low']);
    });
  }
});
