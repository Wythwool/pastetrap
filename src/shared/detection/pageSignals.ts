import type { DetectionRuleMatch, PageSnapshot } from '@/shared/types';
import { createRuleMatch } from '@/shared/detection/rules';
import { sanitizePreview } from '@/shared/detection/sanitize';

const developerContextPattern =
  /(documentation|docs|developer guide|installation|install guide|quick start|readme|npm install|pnpm add|yarn add|brew install|pip install|cargo install|go install|docker compose|kubectl|helm install)/i;

function extractMatches(text: string, pattern: RegExp, max = 3): string[] {
  return Array.from(text.matchAll(pattern), (match) => sanitizePreview(match[0])).slice(0, max);
}

function hasDeveloperContext(snapshot: PageSnapshot): boolean {
  const seed = [snapshot.title, snapshot.metaDescription, ...snapshot.codeBlocks.slice(0, 5), ...snapshot.links.slice(0, 10)].join(' ');
  return developerContextPattern.test(seed);
}

export function matchPageSignals(snapshot: PageSnapshot): DetectionRuleMatch[] {
  const combined = [
    snapshot.title,
    snapshot.metaDescription,
    snapshot.bodyText,
    ...snapshot.buttons,
    ...snapshot.links,
    ...snapshot.dialogs,
    ...snapshot.ariaLabels,
    ...snapshot.dataAttributes,
    ...snapshot.suspiciousContainers
  ].join(' ');

  const matches: DetectionRuleMatch[] = [];

  const fakeVerification = extractMatches(
    combined,
    /(verify(?:ing)? you(?: are)? human|human verification|anti-bot|not a robot|captcha|verify to continue)/gi
  );
  if (fakeVerification.length > 0) {
    matches.push(createRuleMatch('fake-verification-language', fakeVerification, 'page'));
  }

  const runDialog = extractMatches(
    combined,
    /(win\s*\+\s*r|windows key\s*\+\s*r|open the run dialog|open powershell|open command prompt|open terminal|launch terminal)/gi
  );
  if (runDialog.length > 0) {
    matches.push(createRuleMatch('run-dialog-instruction', runDialog, 'page'));
  }

  const clipboardBait = extractMatches(
    combined,
    /(copy the command below|copy and paste|paste the command|press ctrl\s*\+\s*v|press enter to continue|copy now)/gi
  );
  if (clipboardBait.length > 0) {
    matches.push(createRuleMatch('clipboard-bait-language', clipboardBait, 'page'));
  }

  const fakeUpdate = extractMatches(
    combined,
    /(browser update required|security update|support session|re-enable access|playback failed|fix connection|continue update)/gi
  );
  if (fakeUpdate.length > 0) {
    matches.push(createRuleMatch('fake-update-or-support', fakeUpdate, 'page'));
  }

  const imperativeSequence = extractMatches(
    combined,
    /(open[^.]{0,80}copy[^.]{0,80}paste[^.]{0,80}(?:run|enter)|copy[^.]{0,80}paste[^.]{0,80}(?:run|enter))/gi
  );
  if (imperativeSequence.length > 0) {
    matches.push(createRuleMatch('imperative-run-sequence', imperativeSequence, 'page'));
  }

  const terminalMentions = extractMatches(
    combined,
    /(powershell|cmd\.exe|command prompt|terminal|bash|zsh|osascript)/gi
  );
  if (terminalMentions.length > 0) {
    matches.push(createRuleMatch('terminal-name-drop', terminalMentions, 'page'));
  }

  if (snapshot.metrics.copyLikeControls >= 2 && snapshot.metrics.codeBlocks >= 1) {
    const evidence = [`copy-controls:${snapshot.metrics.copyLikeControls}`, `code-blocks:${snapshot.metrics.codeBlocks}`];
    matches.push(createRuleMatch('copy-button-cluster', evidence, 'page'));
  }

  if (hasDeveloperContext(snapshot) && snapshot.metrics.copyLikeControls === 0 && fakeVerification.length === 0) {
    matches.push(createRuleMatch('developer-doc-context', [sanitizePreview(snapshot.title || snapshot.metaDescription || 'docs')], 'page'));
  }

  return matches;
}
