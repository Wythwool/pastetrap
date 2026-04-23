import { ruleCatalog } from '@/shared/detection/rules';
import { hashText } from '@/shared/utils/hash';

export interface RulePackManifest {
  version: string;
  channel: 'stable' | 'beta' | 'dev';
  generatedAt: string;
  ruleCount: number;
  hash: string;
  signature: string;
}

export function buildRulePackHash(): string {
  const stableRules = Object.values(ruleCatalog)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((rule) => ({
      id: rule.id,
      category: rule.category,
      severity: rule.severity,
      weight: rule.weight,
      tags: rule.tags
    }));

  return hashText(JSON.stringify(stableRules));
}

export const localRulePackManifest: RulePackManifest = {
  version: '2026.04.22',
  channel: 'stable',
  generatedAt: '2026-04-22T00:00:00.000Z',
  ruleCount: Object.keys(ruleCatalog).length,
  hash: buildRulePackHash(),
  signature: 'local-bundled-rules'
};

export function verifyBundledRulePack(manifest: RulePackManifest = localRulePackManifest): boolean {
  return manifest.ruleCount === Object.keys(ruleCatalog).length && manifest.hash === buildRulePackHash();
}
