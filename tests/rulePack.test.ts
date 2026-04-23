import { describe, expect, it } from 'vitest';
import { localRulePackManifest, verifyBundledRulePack } from '@/shared/detection/rulePack';
import { ruleCatalog } from '@/shared/detection/rules';

describe('rule pack manifest', () => {
  it('tracks bundled rules with a stable manifest hash', () => {
    expect(localRulePackManifest.ruleCount).toBe(Object.keys(ruleCatalog).length);
    expect(localRulePackManifest.channel).toBe('stable');
    expect(verifyBundledRulePack()).toBe(true);
  });
});
