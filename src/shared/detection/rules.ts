import type { DetectionCategory, DetectionRuleMatch, RiskLevel } from '@/shared/types';

interface RuleDefinition {
  id: string;
  titleKey: string;
  shortKey: string;
  technicalKey: string;
  remediationKey: string;
  category: DetectionCategory;
  severity: RiskLevel;
  weight: number;
  tags: string[];
}

export const ruleCatalog: Record<string, RuleDefinition> = {
  'fake-verification-language': {
    id: 'fake-verification-language',
    titleKey: 'rule.fake-verification-language.title',
    shortKey: 'rule.fake-verification-language.short',
    technicalKey: 'rule.fake-verification-language.tech',
    remediationKey: 'rule.fake-verification-language.fix',
    category: 'fake-verification',
    severity: 'high',
    weight: 22,
    tags: ['captcha', 'verification', 'social-engineering']
  },
  'run-dialog-instruction': {
    id: 'run-dialog-instruction',
    titleKey: 'rule.run-dialog-instruction.title',
    shortKey: 'rule.run-dialog-instruction.short',
    technicalKey: 'rule.run-dialog-instruction.tech',
    remediationKey: 'rule.run-dialog-instruction.fix',
    category: 'terminal-invocation',
    severity: 'high',
    weight: 18,
    tags: ['win-r', 'powershell', 'terminal']
  },
  'clipboard-bait-language': {
    id: 'clipboard-bait-language',
    titleKey: 'rule.clipboard-bait-language.title',
    shortKey: 'rule.clipboard-bait-language.short',
    technicalKey: 'rule.clipboard-bait-language.tech',
    remediationKey: 'rule.clipboard-bait-language.fix',
    category: 'clipboard-bait',
    severity: 'medium',
    weight: 12,
    tags: ['copy', 'paste', 'run']
  },
  'copy-button-cluster': {
    id: 'copy-button-cluster',
    titleKey: 'rule.copy-button-cluster.title',
    shortKey: 'rule.copy-button-cluster.short',
    technicalKey: 'rule.copy-button-cluster.tech',
    remediationKey: 'rule.copy-button-cluster.fix',
    category: 'dom-cluster',
    severity: 'medium',
    weight: 10,
    tags: ['copy', 'layout']
  },
  'fake-update-or-support': {
    id: 'fake-update-or-support',
    titleKey: 'rule.fake-update-or-support.title',
    shortKey: 'rule.fake-update-or-support.short',
    technicalKey: 'rule.fake-update-or-support.tech',
    remediationKey: 'rule.fake-update-or-support.fix',
    category: 'page-social-engineering',
    severity: 'medium',
    weight: 14,
    tags: ['update', 'support', 'pressure']
  },
  'imperative-run-sequence': {
    id: 'imperative-run-sequence',
    titleKey: 'rule.imperative-run-sequence.title',
    shortKey: 'rule.imperative-run-sequence.short',
    technicalKey: 'rule.imperative-run-sequence.tech',
    remediationKey: 'rule.imperative-run-sequence.fix',
    category: 'page-social-engineering',
    severity: 'medium',
    weight: 12,
    tags: ['step-by-step', 'instructions']
  },
  'terminal-name-drop': {
    id: 'terminal-name-drop',
    titleKey: 'rule.terminal-name-drop.title',
    shortKey: 'rule.terminal-name-drop.short',
    technicalKey: 'rule.terminal-name-drop.tech',
    remediationKey: 'rule.terminal-name-drop.fix',
    category: 'terminal-invocation',
    severity: 'low',
    weight: 8,
    tags: ['powershell', 'terminal', 'cmd']
  },
  'iframe-verification-bait': {
    id: 'iframe-verification-bait',
    titleKey: 'rule.iframe-verification-bait.title',
    shortKey: 'rule.iframe-verification-bait.short',
    technicalKey: 'rule.iframe-verification-bait.tech',
    remediationKey: 'rule.iframe-verification-bait.fix',
    category: 'fake-verification',
    severity: 'medium',
    weight: 10,
    tags: ['iframe', 'verification']
  },
  'shadow-dom-bait': {
    id: 'shadow-dom-bait',
    titleKey: 'rule.shadow-dom-bait.title',
    shortKey: 'rule.shadow-dom-bait.short',
    technicalKey: 'rule.shadow-dom-bait.tech',
    remediationKey: 'rule.shadow-dom-bait.fix',
    category: 'dom-cluster',
    severity: 'medium',
    weight: 10,
    tags: ['shadow-dom', 'hidden-render']
  },
  'media-verification-bait': {
    id: 'media-verification-bait',
    titleKey: 'rule.media-verification-bait.title',
    shortKey: 'rule.media-verification-bait.short',
    technicalKey: 'rule.media-verification-bait.tech',
    remediationKey: 'rule.media-verification-bait.fix',
    category: 'fake-verification',
    severity: 'low',
    weight: 6,
    tags: ['canvas', 'media']
  },
  'clipboard-payload-command': {
    id: 'clipboard-payload-command',
    titleKey: 'rule.clipboard-payload-command.title',
    shortKey: 'rule.clipboard-payload-command.short',
    technicalKey: 'rule.clipboard-payload-command.tech',
    remediationKey: 'rule.clipboard-payload-command.fix',
    category: 'clipboard-bait',
    severity: 'high',
    weight: 18,
    tags: ['clipboard', 'payload']
  },
  'remote-download-execute': {
    id: 'remote-download-execute',
    titleKey: 'rule.remote-download-execute.title',
    shortKey: 'rule.remote-download-execute.short',
    technicalKey: 'rule.remote-download-execute.tech',
    remediationKey: 'rule.remote-download-execute.fix',
    category: 'download-execute',
    severity: 'critical',
    weight: 28,
    tags: ['url', 'execute', 'delivery']
  },
  'encoded-payload': {
    id: 'encoded-payload',
    titleKey: 'rule.encoded-payload.title',
    shortKey: 'rule.encoded-payload.short',
    technicalKey: 'rule.encoded-payload.tech',
    remediationKey: 'rule.encoded-payload.fix',
    category: 'obfuscation',
    severity: 'critical',
    weight: 24,
    tags: ['encoded', 'base64', 'payload']
  },
  'windows-lolbin-abuse': {
    id: 'windows-lolbin-abuse',
    titleKey: 'rule.windows-lolbin-abuse.title',
    shortKey: 'rule.windows-lolbin-abuse.short',
    technicalKey: 'rule.windows-lolbin-abuse.tech',
    remediationKey: 'rule.windows-lolbin-abuse.fix',
    category: 'command-primitive',
    severity: 'high',
    weight: 18,
    tags: ['lolbin', 'windows']
  },
  'unix-pipe-shell': {
    id: 'unix-pipe-shell',
    titleKey: 'rule.unix-pipe-shell.title',
    shortKey: 'rule.unix-pipe-shell.short',
    technicalKey: 'rule.unix-pipe-shell.tech',
    remediationKey: 'rule.unix-pipe-shell.fix',
    category: 'command-primitive',
    severity: 'high',
    weight: 20,
    tags: ['unix', 'pipe', 'shell']
  },
  'macos-osascript': {
    id: 'macos-osascript',
    titleKey: 'rule.macos-osascript.title',
    shortKey: 'rule.macos-osascript.short',
    technicalKey: 'rule.macos-osascript.tech',
    remediationKey: 'rule.macos-osascript.fix',
    category: 'platform-specific',
    severity: 'high',
    weight: 20,
    tags: ['macos', 'osascript']
  },
  'temp-execute-chain': {
    id: 'temp-execute-chain',
    titleKey: 'rule.temp-execute-chain.title',
    shortKey: 'rule.temp-execute-chain.short',
    technicalKey: 'rule.temp-execute-chain.tech',
    remediationKey: 'rule.temp-execute-chain.fix',
    category: 'download-execute',
    severity: 'high',
    weight: 18,
    tags: ['temp', 'execute']
  },
  'obfuscation-signals': {
    id: 'obfuscation-signals',
    titleKey: 'rule.obfuscation-signals.title',
    shortKey: 'rule.obfuscation-signals.short',
    technicalKey: 'rule.obfuscation-signals.tech',
    remediationKey: 'rule.obfuscation-signals.fix',
    category: 'obfuscation',
    severity: 'high',
    weight: 16,
    tags: ['obfuscation', 'encoding']
  },
  'multi-stage-chain': {
    id: 'multi-stage-chain',
    titleKey: 'rule.multi-stage-chain.title',
    shortKey: 'rule.multi-stage-chain.short',
    technicalKey: 'rule.multi-stage-chain.tech',
    remediationKey: 'rule.multi-stage-chain.fix',
    category: 'download-execute',
    severity: 'high',
    weight: 18,
    tags: ['multi-stage', 'chain']
  },
  'developer-doc-context': {
    id: 'developer-doc-context',
    titleKey: 'rule.developer-doc-context.title',
    shortKey: 'rule.developer-doc-context.short',
    technicalKey: 'rule.developer-doc-context.tech',
    remediationKey: 'rule.developer-doc-context.fix',
    category: 'page-social-engineering',
    severity: 'info',
    weight: -14,
    tags: ['docs', 'developer', 'noise-reduction']
  }
};

export function createRuleMatch(
  ruleId: keyof typeof ruleCatalog,
  evidence: string[],
  source: 'page' | 'command'
): DetectionRuleMatch {
  const rule = ruleCatalog[ruleId];

  return {
    id: rule.id,
    titleKey: rule.titleKey,
    shortKey: rule.shortKey,
    technicalKey: rule.technicalKey,
    remediationKey: rule.remediationKey,
    category: rule.category,
    severity: rule.severity,
    weight: rule.weight,
    tags: rule.tags,
    evidence,
    source
  };
}
