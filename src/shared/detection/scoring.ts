import { ruleCatalog } from '@/shared/detection/rules';
import type {
  AppSettings,
  DetectionRuleMatch,
  RiskLevel,
  ScoreTraceItem,
  SensitivityProfile
} from '@/shared/types';

const sensitivityMultiplier: Record<SensitivityProfile, number> = {
  low: 0.85,
  balanced: 1,
  strict: 1.2
};

const thresholds: Record<SensitivityProfile, [number, number, number, number]> = {
  low: [20, 42, 68, 92],
  balanced: [15, 35, 60, 84],
  strict: [12, 28, 48, 72]
};

function levelFromScore(profile: SensitivityProfile, score: number): RiskLevel {
  const [low, medium, high, critical] = thresholds[profile];

  if (score >= critical) {
    return 'critical';
  }

  if (score >= high) {
    return 'high';
  }

  if (score >= medium) {
    return 'medium';
  }

  if (score >= low) {
    return 'low';
  }

  return 'info';
}

function pushTrace(trace: ScoreTraceItem[], ruleId: string, added: number, reason: string): void {
  trace.push({ ruleId, added, reason });
}

export function scoreMatches(matches: DetectionRuleMatch[], settings: AppSettings): {
  score: number;
  level: RiskLevel;
  trace: ScoreTraceItem[];
} {
  const enabledMatches = matches.filter((match) => settings.enabledCategories[match.category]);
  const multiplier = sensitivityMultiplier[settings.sensitivity];
  const trace: ScoreTraceItem[] = [];
  let score = 0;

  for (const match of enabledMatches) {
    const added = Math.round(match.weight * multiplier);
    score += added;
    pushTrace(trace, match.id, added, `rule:${match.id}`);
  }

  const ruleIds = new Set(enabledMatches.map((match) => match.id));
  const positiveMatches = enabledMatches.filter((match) => match.weight > 0);
  const highSignalCount = positiveMatches.filter((match) => ruleCatalog[match.id]?.weight >= 16).length;

  if (ruleIds.has('run-dialog-instruction') && ruleIds.has('clipboard-bait-language')) {
    score += 10;
    pushTrace(trace, 'compound-terminal-clipboard', 10, 'terminal-plus-copy');
  }

  if (ruleIds.has('fake-verification-language') && ruleIds.has('remote-download-execute')) {
    score += 12;
    pushTrace(trace, 'compound-fake-verification-exec', 12, 'verification-plus-exec');
  }

  if (ruleIds.has('encoded-payload') && ruleIds.has('obfuscation-signals')) {
    score += 10;
    pushTrace(trace, 'compound-obfuscation', 10, 'encoded-plus-obfuscated');
  }

  if (highSignalCount >= 3) {
    score += 8;
    pushTrace(trace, 'compound-many-high-signals', 8, 'three-high-signals');
  }

  if (ruleIds.has('developer-doc-context')) {
    const hasExecutionSignal =
      ruleIds.has('remote-download-execute') ||
      ruleIds.has('encoded-payload') ||
      ruleIds.has('windows-lolbin-abuse') ||
      ruleIds.has('unix-pipe-shell') ||
      ruleIds.has('macos-osascript') ||
      ruleIds.has('temp-execute-chain') ||
      ruleIds.has('multi-stage-chain');

    if (!hasExecutionSignal && !ruleIds.has('fake-verification-language')) {
      score -= 8;
      pushTrace(trace, 'docs-downgrade', -8, 'developer-doc-context-without-execution');
    }
  }

  if (positiveMatches.length <= 2 && !ruleIds.has('remote-download-execute') && !ruleIds.has('encoded-payload')) {
    score = Math.min(score, 58);
    pushTrace(trace, 'low-confidence-cap', 0, 'cap-medium-on-thin-signal-pages');
  }

  score = Math.max(score, 0);
  const level = levelFromScore(settings.sensitivity, score);
  return { score, level, trace };
}
