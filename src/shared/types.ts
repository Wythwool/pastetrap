export type Language = 'en' | 'ru';

export type RiskLevel = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type SensitivityProfile = 'low' | 'balanced' | 'strict';

export type DetectionCategory =
  | 'page-social-engineering'
  | 'terminal-invocation'
  | 'clipboard-bait'
  | 'fake-verification'
  | 'dom-cluster'
  | 'command-primitive'
  | 'download-execute'
  | 'obfuscation'
  | 'platform-specific';

export type CommandPlatform = 'windows' | 'unix' | 'macos' | 'unknown';

export type CommandSource = 'code-block' | 'inline' | 'copy-neighbor';

export type ScanSource = 'initial' | 'mutation' | 'route' | 'popup-action';

export type UserAction =
  | 'overlay-shown'
  | 'back-to-safety'
  | 'ignore-once'
  | 'trust-domain'
  | 'copy-evidence'
  | 'popup-rescan'
  | 'popup-trust-domain'
  | 'popup-untrust-domain';

export interface PageMetrics {
  copyLikeControls: number;
  suspiciousContainers: number;
  codeBlocks: number;
  dialogs: number;
}

export interface PageSnapshot {
  url: string;
  domain: string;
  title: string;
  metaDescription: string;
  bodyText: string;
  buttons: string[];
  links: string[];
  codeBlocks: string[];
  dialogs: string[];
  ariaLabels: string[];
  dataAttributes: string[];
  suspiciousContainers: string[];
  copyCommandPairs: string[];
  metrics: PageMetrics;
}

export interface CommandIndicator {
  id: string;
  tag: string;
  evidence: string;
}

export interface CommandCandidate {
  id: string;
  raw: string;
  normalized: string;
  preview: string;
  fingerprint: string;
  tokens: string[];
  platform: CommandPlatform;
  source: CommandSource;
  indicators: CommandIndicator[];
}

export interface DetectionRuleMatch {
  id: string;
  titleKey: string;
  shortKey: string;
  technicalKey: string;
  remediationKey: string;
  category: DetectionCategory;
  severity: RiskLevel;
  weight: number;
  tags: string[];
  evidence: string[];
  source: 'page' | 'command';
}

export interface ScoreTraceItem {
  ruleId: string;
  added: number;
  reason: string;
}

export interface ScanResult {
  scanId: string;
  timestamp: string;
  url: string;
  domain: string;
  title: string;
  source: ScanSource;
  trusted: boolean;
  ignored: boolean;
  score: number;
  level: RiskLevel;
  headlineRuleId: string | null;
  summaryKey: string;
  explanationKey: string;
  fingerprint: string;
  matchedRules: DetectionRuleMatch[];
  commands: CommandCandidate[];
  scoringTrace: ScoreTraceItem[];
}

export interface AppSettings {
  sensitivity: SensitivityProfile;
  language: Language;
  enabledCategories: Record<DetectionCategory, boolean>;
  trustedDomains: string[];
  logLimit: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  domain: string;
  url: string;
  pageTitle: string;
  score: number;
  riskLevel: RiskLevel;
  matchedSignals: string[];
  matchedRules: string[];
  commandFingerprint: string | null;
  commandPreview: string | null;
  userAction: UserAction | 'scan';
  sensitivityProfile: SensitivityProfile;
  extensionVersion: string;
  source: ScanSource;
}

export interface LatestTabState {
  tabId: number;
  url: string;
  domain: string;
  result: ScanResult;
  updatedAt: string;
}
