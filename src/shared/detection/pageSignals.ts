import type { DetectionRuleMatch, PageSnapshot } from '@/shared/types';
import { createRuleMatch } from '@/shared/detection/rules';
import { sanitizePreview } from '@/shared/detection/sanitize';
import { normalizeWhitespace } from '@/shared/utils/text';

const developerContextPattern =
  /(documentation|docs|developer guide|installation|install guide|quick start|readme|npm install|pnpm add|yarn add|brew install|pip install|cargo install|go install|docker compose|kubectl|helm install|документац|руководство разработчика|инструкция по установке|швидкий старт|документація|guía de desarrollo|instalación|inicio rápido)/i;

const negationWindowPattern = /\b(?:no|not|never|without|не|нет|без|никогда|немає|не треба|sin|nunca)\b/i;

function extractMatches(text: string, pattern: RegExp, max = 3): string[] {
  const matches: string[] = [];

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    const before = text.slice(Math.max(0, index - 28), index);
    if (negationWindowPattern.test(before)) {
      continue;
    }

    matches.push(sanitizePreview(match[0]));
    if (matches.length >= max) {
      break;
    }
  }

  return matches;
}

function hasDeveloperContext(snapshot: PageSnapshot): boolean {
  const seed = [
    snapshot.title,
    snapshot.metaDescription,
    ...snapshot.codeBlocks.slice(0, 6),
    ...snapshot.links.slice(0, 10),
    ...(snapshot.shadowText?.slice(0, 3) ?? [])
  ].join(' ');

  return developerContextPattern.test(seed);
}

function compactEvidence(values: string[], fallback: string): string[] {
  const normalized = values.map((value) => normalizeWhitespace(value)).filter(Boolean);
  return normalized.length > 0 ? normalized.slice(0, 4) : [fallback];
}

export function matchPageSignals(snapshot: PageSnapshot): DetectionRuleMatch[] {
  const shadowText = snapshot.shadowText ?? [];
  const iframeDescriptors = snapshot.iframeDescriptors ?? [];
  const mediaDescriptors = snapshot.mediaDescriptors ?? [];
  const clipboardPayloads = snapshot.clipboardPayloads ?? [];
  const combined = [
    snapshot.title,
    snapshot.metaDescription,
    snapshot.bodyText,
    ...shadowText,
    ...snapshot.buttons,
    ...snapshot.links,
    ...snapshot.dialogs,
    ...snapshot.ariaLabels,
    ...snapshot.dataAttributes,
    ...snapshot.suspiciousContainers,
    ...snapshot.copyCommandPairs,
    ...iframeDescriptors,
    ...mediaDescriptors,
    ...clipboardPayloads
  ].join(' ');

  const matches: DetectionRuleMatch[] = [];

  const fakeVerification = extractMatches(
    combined,
    /(verify(?:ing)? you(?: are)? human|human verification|anti-bot|not a robot|captcha|verify to continue|prove you are human|security check|browser check|проверк[аи] человеком|подтвердите что вы человек|я не робот|капч[ауы]|антибот|перевір(?:ка|те).*людин|я не робот|captcha|verifica(?:r|ción).*humano|no soy un robot|comprobación de seguridad)/gi
  );
  if (fakeVerification.length > 0) {
    matches.push(createRuleMatch('fake-verification-language', fakeVerification, 'page'));
  }

  const runDialog = extractMatches(
    combined,
    /(win\s*\+\s*r|windows key\s*\+\s*r|open the run dialog|open powershell|open command prompt|open terminal|launch terminal|press\s+windows\s+and\s+r|нажмите\s+win\s*\+\s*r|откройте\s+powershell|откройте\s+командн|откройте\s+терминал|натисн(?:іть|и).*win\s*\+\s*r|відкрий(?:те)?.*powershell|відкрий(?:те)?.*термінал|abre\s+(?:powershell|terminal|símbolo del sistema)|pulsa\s+win\s*\+\s*r)/gi
  );
  if (runDialog.length > 0) {
    matches.push(createRuleMatch('run-dialog-instruction', runDialog, 'page'));
  }

  const clipboardBait = extractMatches(
    combined,
    /(copy the command below|copy and paste|paste the command|press ctrl\s*\+\s*v|press enter to continue|copy now|скопируйте команду|скопируйте и вставьте|вставьте команду|нажмите ctrl\s*\+\s*v|нажмите enter|скопіюйте команду|скопіюйте та вставте|вставте команду|натисн(?:іть|и) ctrl\s*\+\s*v|copi[ae] el comando|copiar y pegar|pega el comando|pulsa ctrl\s*\+\s*v|presiona enter)/gi
  );
  if (clipboardBait.length > 0) {
    matches.push(createRuleMatch('clipboard-bait-language', clipboardBait, 'page'));
  }

  const fakeUpdate = extractMatches(
    combined,
    /(browser update required|security update|support session|re-enable access|playback failed|fix connection|continue update|обновление браузера|обновление безопасности|сеанс поддержки|восстановить доступ|исправить соединение|оновлення браузера|оновлення безпеки|сеанс підтримки|відновити доступ|actualización del navegador|actualización de seguridad|sesión de soporte|restablecer acceso|arreglar conexión)/gi
  );
  if (fakeUpdate.length > 0) {
    matches.push(createRuleMatch('fake-update-or-support', fakeUpdate, 'page'));
  }

  const imperativeSequence = extractMatches(
    combined,
    /(open[^.]{0,100}copy[^.]{0,100}paste[^.]{0,100}(?:run|enter)|copy[^.]{0,100}paste[^.]{0,100}(?:run|enter)|открой[^.]{0,100}скопир[^.]{0,100}встав[^.]{0,100}(?:enter|запуст)|відкрий[^.]{0,100}скопію[^.]{0,100}встав[^.]{0,100}(?:enter|запуст)|abre[^.]{0,100}copia[^.]{0,100}pega[^.]{0,100}(?:enter|ejecuta))/gi
  );
  if (imperativeSequence.length > 0) {
    matches.push(createRuleMatch('imperative-run-sequence', imperativeSequence, 'page'));
  }

  const terminalMentions = extractMatches(
    combined,
    /(powershell|pwsh|cmd\.exe|command prompt|terminal|bash|zsh|osascript|командн(?:ая|ую) строк|терминал|термінал|símbolo del sistema)/gi
  );
  if (terminalMentions.length > 0) {
    matches.push(createRuleMatch('terminal-name-drop', terminalMentions, 'page'));
  }

  if (snapshot.metrics.copyLikeControls >= 2 && snapshot.metrics.codeBlocks >= 1) {
    const evidence = [`copy-controls:${snapshot.metrics.copyLikeControls}`, `code-blocks:${snapshot.metrics.codeBlocks}`];
    matches.push(createRuleMatch('copy-button-cluster', evidence, 'page'));
  }

  if (iframeDescriptors.length > 0 && (fakeVerification.length > 0 || clipboardBait.length > 0 || runDialog.length > 0)) {
    matches.push(createRuleMatch('iframe-verification-bait', compactEvidence(iframeDescriptors, 'iframe flow'), 'page'));
  }

  if (shadowText.length > 0 && (fakeVerification.length > 0 || clipboardBait.length > 0 || runDialog.length > 0)) {
    matches.push(createRuleMatch('shadow-dom-bait', compactEvidence(shadowText, 'shadow-dom copy flow'), 'page'));
  }

  if (mediaDescriptors.length > 0 && (fakeVerification.length > 0 || fakeUpdate.length > 0)) {
    matches.push(createRuleMatch('media-verification-bait', compactEvidence(mediaDescriptors, 'canvas/media verification flow'), 'page'));
  }

  if (hasDeveloperContext(snapshot) && snapshot.metrics.copyLikeControls === 0 && fakeVerification.length === 0) {
    matches.push(createRuleMatch('developer-doc-context', [sanitizePreview(snapshot.title || snapshot.metaDescription || 'docs')], 'page'));
  }

  return matches;
}
