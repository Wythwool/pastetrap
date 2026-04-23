import { collectPageSnapshot } from '@/content/pageCollector';
import { mountOverlay } from '@/content/overlay/mountOverlay';
import { analyzePage } from '@/shared/detection/engine';
import { preferredLanguage } from '@/shared/i18n/messages';
import type { RuntimeMessage, ScanDoneResponse } from '@/shared/messages';
import type { AppSettings, Language, LogEntry, ScanResult, ScanSource, UserAction } from '@/shared/types';
import { metadata } from '@/shared/brand/metadata';
import { createPageKey, getDomainFromUrl, isTrustedUrl } from '@/shared/utils/domain';
import { createId } from '@/shared/utils/id';
import { getExtensionApi, runtimeSendMessage } from '@/shared/utils/browser';
import { normalizeWhitespace, truncate, uniqueStrings } from '@/shared/utils/text';

interface OverlayController {
  update: (language: Language, result: ScanResult) => void;
  destroy: () => void;
}

interface ScanOptions {
  force?: boolean;
  forceSettings?: boolean;
}

const settingsCacheTtlMs = 5000;
const scanDebounceMs = 900;
const scanMinimumGapMs = 900;
const scanBudgetMs = 1800;
const observedClipboardPayloadLimit = 20;

let settings: AppSettings | null = null;
let settingsLoadedAt = 0;
let sessionIgnores: string[] = [];
let overlay: OverlayController | null = null;
let overlayFingerprint: string | null = null;
let lastResult: ScanResult | null = null;
let lastScanAt = 0;
let scheduledScan: number | null = null;
let scanInFlight: Promise<ScanResult | null> | null = null;
let observedClipboardPayloads: string[] = [];

function rememberClipboardPayload(value: string): void {
  const normalized = truncate(normalizeWhitespace(value), 1600);
  if (!normalized || normalized.length < 8) {
    return;
  }

  observedClipboardPayloads = uniqueStrings([normalized, ...observedClipboardPayloads]).slice(0, observedClipboardPayloadLimit);
}

async function refreshSettings(force = false): Promise<void> {
  if (!force && settings && Date.now() - settingsLoadedAt < settingsCacheTtlMs) {
    return;
  }

  const response = await runtimeSendMessage({ type: 'PT_GET_SETTINGS' });
  settings = response.settings;
  sessionIgnores = response.sessionIgnores;
  settingsLoadedAt = Date.now();
}

function invalidateSettingsCache(): void {
  settingsLoadedAt = 0;
}

function currentLanguage(): Language {
  return settings?.language ?? preferredLanguage(navigator.language);
}

function buildBypassResult(source: ScanSource, trusted: boolean, ignored: boolean): ScanResult {
  const url = window.location.href;
  const domain = getDomainFromUrl(url);

  return {
    scanId: createId('scan', `${source}:${url}:${Date.now()}`),
    timestamp: new Date().toISOString(),
    url,
    domain,
    title: document.title || 'Untitled page',
    source,
    trusted,
    ignored,
    score: 0,
    level: 'info',
    headlineRuleId: null,
    summaryKey: 'summary.info',
    explanationKey: trusted || ignored ? 'common.safe' : 'explanation.info',
    fingerprint: `${source}:${url}:${trusted}:${ignored}`,
    matchedRules: [],
    commands: [],
    scoringTrace: []
  };
}

function scanDoneResponse(result: ScanResult | null): ScanDoneResponse {
  return {
    ok: true,
    scanId: result?.scanId ?? null,
    updatedAt: result?.timestamp ?? null,
    fingerprint: result?.fingerprint ?? null,
    level: result?.level ?? null
  };
}

async function logAction(action: UserAction, result: ScanResult): Promise<void> {
  if (!settings) {
    return;
  }

  const entry: LogEntry = {
    id: createId('action', `${action}:${result.fingerprint}:${Date.now()}`),
    timestamp: new Date().toISOString(),
    domain: result.domain,
    url: result.url,
    pageTitle: result.title,
    score: result.score,
    riskLevel: result.level,
    matchedSignals: result.matchedRules.map((rule) => rule.titleKey),
    matchedRules: result.matchedRules.map((rule) => rule.id),
    commandFingerprint: result.commands[0]?.fingerprint ?? null,
    commandPreview: result.commands[0]?.preview ?? null,
    userAction: action,
    sensitivityProfile: settings.sensitivity,
    extensionVersion: getExtensionApi().runtime.getManifest().version,
    source: result.source
  };

  await runtimeSendMessage({ type: 'PT_LOG_ACTION', entry });
}

function destroyOverlay(): void {
  overlay?.destroy();
  overlay = null;
  overlayFingerprint = null;
}

async function handleBackToSafety(): Promise<void> {
  if (lastResult) {
    await logAction('back-to-safety', lastResult);
  }

  destroyOverlay();
  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  window.location.replace('about:blank');
}

async function handleIgnoreOnce(): Promise<void> {
  if (!lastResult) {
    return;
  }

  await runtimeSendMessage({ type: 'PT_IGNORE_PAGE', pageKey: createPageKey(window.location.href) });
  sessionIgnores = [...new Set([...sessionIgnores, createPageKey(window.location.href)])];
  await logAction('ignore-once', lastResult);
  destroyOverlay();
  await runScan('popup-action', { force: true });
}

async function handleTrustSite(): Promise<void> {
  if (!lastResult) {
    return;
  }

  await runtimeSendMessage({ type: 'PT_TRUST_SITE', url: lastResult.url, scope: 'host' });
  invalidateSettingsCache();
  await refreshSettings(true);
  await logAction('trust-domain', lastResult);
  destroyOverlay();
  await runScan('popup-action', { force: true });
}

async function handleCopyEvidence(): Promise<void> {
  if (lastResult) {
    await logAction('copy-evidence', lastResult);
  }
}

async function maybeShowOverlay(result: ScanResult): Promise<void> {
  if (result.trusted || result.ignored || !['high', 'critical'].includes(result.level)) {
    destroyOverlay();
    return;
  }

  if (overlay && overlayFingerprint === result.fingerprint) {
    overlay.update(currentLanguage(), result);
    return;
  }

  destroyOverlay();
  overlay = mountOverlay(currentLanguage(), result, {
    onBackToSafety: () => {
      void handleBackToSafety();
    },
    onIgnoreOnce: () => {
      void handleIgnoreOnce();
    },
    onTrustDomain: () => {
      void handleTrustSite();
    },
    onCopyEvidence: () => {
      void handleCopyEvidence();
    }
  });
  overlayFingerprint = result.fingerprint;
  await logAction('overlay-shown', result);
}

async function reportResult(result: ScanResult): Promise<void> {
  lastResult = result;
  await runtimeSendMessage({ type: 'PT_REPORT_SCAN', result });
  await maybeShowOverlay(result);
}

async function doScan(source: ScanSource, options: ScanOptions): Promise<ScanResult | null> {
  const startedAt = performance.now();

  await refreshSettings(options.forceSettings ?? false);
  if (!settings) {
    return null;
  }

  const pageKey = createPageKey(window.location.href);
  const trusted = isTrustedUrl(window.location.href, settings);
  const ignored = sessionIgnores.includes(pageKey);
  const result = trusted || ignored
    ? buildBypassResult(source, trusted, ignored)
    : analyzePage(collectPageSnapshot({ clipboardPayloads: observedClipboardPayloads }), settings, source);

  result.trusted = trusted;
  result.ignored = ignored;
  await reportResult(result);

  const elapsed = performance.now() - startedAt;
  if (elapsed > scanBudgetMs) {
    console.warn(`${metadata.productName} scan exceeded budget`, Math.round(elapsed));
  }

  return result;
}

async function runScan(source: ScanSource, options: ScanOptions = {}): Promise<ScanResult | null> {
  if (scanInFlight) {
    await scanInFlight;
    if (!options.force) {
      return lastResult;
    }
  }

  scanInFlight = doScan(source, options).catch((error: unknown) => {
    console.error(`${metadata.productName} scan failed`, error);
    return null;
  }).finally(() => {
    lastScanAt = Date.now();
    scanInFlight = null;
  });

  return scanInFlight;
}

function scheduleScan(source: ScanSource): void {
  const now = Date.now();
  const delay = Math.max(scanDebounceMs, scanMinimumGapMs - (now - lastScanAt));

  if (scheduledScan !== null) {
    window.clearTimeout(scheduledScan);
  }

  scheduledScan = window.setTimeout(() => {
    scheduledScan = null;
    void runScan(source);
  }, delay);
}

function patchHistory(): void {
  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  window.history.pushState = function pushState(...args) {
    originalPushState.apply(this, args);
    scheduleScan('route');
  };

  window.history.replaceState = function replaceState(...args) {
    originalReplaceState.apply(this, args);
    scheduleScan('route');
  };

  window.addEventListener('popstate', () => scheduleScan('route'));
}

function isOwnOverlayNode(node: Node): boolean {
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }

  const element = node as Element;
  return element.id === 'pastetrap-overlay-host' || Boolean(element.closest?.('#pastetrap-overlay-host'));
}

function isMeaningfulMutation(record: MutationRecord): boolean {
  if (record.type === 'attributes') {
    const target = record.target as Element;
    if (isOwnOverlayNode(target)) {
      return false;
    }

    return /^(class|style|aria-label|title|role|data-|src|href|value|onclick)/.test(record.attributeName ?? '');
  }

  return Array.from(record.addedNodes).some((node) => {
    if (isOwnOverlayNode(node)) {
      return false;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      return normalizeWhitespace(node.textContent ?? '').length > 30;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    const element = node as Element;
    const tag = element.tagName.toLowerCase();
    if (['script', 'style', 'link', 'meta', 'noscript'].includes(tag)) {
      return false;
    }

    return normalizeWhitespace(element.textContent ?? '').length > 20 || element.querySelector?.('iframe, dialog, button, pre, code, textarea, canvas, video, audio, [data-command], [data-copy]') !== null;
  });
}

function observeMutations(): void {
  const observer = new MutationObserver((records) => {
    if (records.some(isMeaningfulMutation)) {
      scheduleScan('mutation');
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'aria-label', 'title', 'role', 'src', 'href', 'value', 'onclick', 'data-command', 'data-action', 'data-copy', 'data-payload', 'data-clipboard']
  });
}

function observeClipboardishEvents(): void {
  document.addEventListener('copy', () => {
    const selection = String(window.getSelection?.() ?? '');
    rememberClipboardPayload(selection);
    scheduleScan('clipboard');
  }, true);

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) {
      return;
    }

    const control = target.closest('button, [role="button"], a, input, [onclick], [data-copy], [data-command], [data-payload], [data-clipboard]');
    if (!control) {
      return;
    }

    const values = ['data-command', 'data-copy', 'data-payload', 'data-clipboard-text', 'value', 'onclick', 'aria-label', 'title']
      .map((name) => control.getAttribute(name) ?? '')
      .filter(Boolean);

    for (const value of values) {
      rememberClipboardPayload(value);
    }

    const text = normalizeWhitespace(control.textContent ?? '');
    if (/(copy|скопир|копію|copiar|verify|провер|перевір|verificar)/i.test(text)) {
      scheduleScan('clipboard');
    }
  }, true);
}

function observeSettingsChanges(): void {
  const api = getExtensionApi();
  api.storage?.onChanged?.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.settings) {
      settings = null;
      invalidateSettingsCache();
      scheduleScan('mutation');
    }
  });
}

getExtensionApi().runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  if ((message as { type?: string }).type === 'PT_TRIGGER_SCAN') {
    if (scheduledScan !== null) {
      window.clearTimeout(scheduledScan);
      scheduledScan = null;
    }

    void runScan('popup-action', { force: true, forceSettings: true })
      .then((result) => sendResponse(scanDoneResponse(result)))
      .catch((error: unknown) => {
        console.error(`${metadata.productName} popup-triggered scan failed`, error);
        sendResponse(scanDoneResponse(null));
      });
    return true;
  }

  return false;
});

patchHistory();
observeMutations();
observeClipboardishEvents();
observeSettingsChanges();
void refreshSettings(true).then(() => runScan('initial', { force: true }));
