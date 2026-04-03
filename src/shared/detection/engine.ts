import { extractCommandCandidates } from '@/shared/detection/commandExtractor';
import { matchCommandSignals } from '@/shared/detection/commandSignals';
import { matchPageSignals } from '@/shared/detection/pageSignals';
import { scoreMatches } from '@/shared/detection/scoring';
import type { AppSettings, PageSnapshot, ScanResult, ScanSource } from '@/shared/types';
import { createId } from '@/shared/utils/id';
import { hashText } from '@/shared/utils/hash';

function pickHeadlineRuleId(matchIds: string[]): string | null {
  return matchIds[0] ?? null;
}

export function analyzePage(snapshot: PageSnapshot, settings: AppSettings, source: ScanSource): ScanResult {
  const pageMatches = matchPageSignals(snapshot);
  const commands = extractCommandCandidates(snapshot);
  const commandMatches = matchCommandSignals(commands);
  const combinedMatches = [...pageMatches, ...commandMatches].sort((left, right) => right.weight - left.weight);
  const { score, level, trace } = scoreMatches(combinedMatches, settings);
  const headlineRuleId = pickHeadlineRuleId(combinedMatches.filter((match) => match.weight > 0).map((match) => match.id));
  const fingerprintSeed = [snapshot.url, level, ...combinedMatches.map((match) => match.id), ...commands.map((command) => command.fingerprint)].join('|');

  return {
    scanId: createId('scan', `${source}:${snapshot.url}:${Date.now()}`),
    timestamp: new Date().toISOString(),
    url: snapshot.url,
    domain: snapshot.domain,
    title: snapshot.title,
    source,
    trusted: false,
    ignored: false,
    score,
    level,
    headlineRuleId,
    summaryKey: `summary.${level}`,
    explanationKey: `explanation.${level}`,
    fingerprint: hashText(fingerprintSeed),
    matchedRules: combinedMatches,
    commands,
    scoringTrace: trace
  };
}
