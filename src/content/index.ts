import { collectPageSnapshot } from '@/content/pageCollector';
import { mountOverlay } from '@/content/overlay/mountOverlay';
import { analyzePage } from '@/shared/detection/engine';
import { preferredLanguage } from '@/shared/i18n/messages';
import type { RuntimeMessage, SettingsResponse } from '@/shared/messages';
import type { AppSettings, Language, LogEntry, ScanResult, ScanSource, UserAction } from '@/shared/types';
import { metadata } from '@/shared/brand/metadata';
import { createPageKey, getDomainFromUrl, isTrustedDomain } from '@/shared/utils/domain';
import { createId } from '@/shared/utils/id';
import { getExtensionApi, runtimeSendMessage } from '@/shared/utils/browser';

interface OverlayController {
  update: (language: Language, result: ScanResult) => void;
  destroy: () => void;
}

let settings: AppSettings | null = null;
let sessionIgnores: string[] = [];
let overlay: OverlayController | null = null;
let overlayFingerprint: string | null = null;
let lastResult: ScanResult | null = null;
let lastScanAt = 0;
let scheduledScan: number | null = null;
let scanInFlight = false;

async function refreshSettings(): Promise<void> {
  const response = await runtimeSendMessage<SettingsResponse>({ type: 'PT_GET_SETTINGS' });
  settings = response.settings;
  sessionIgnores = response.sessionIgnores;
}

function currentLanguage(): Language {
  if (settings) {
    return settings.language;
  }

  return preferredLanguage(navigator.language);
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
  await runScan('popup-action');
}

async function handleTrustDomain(): Promise<void> {
  if (!lastResult || !settings) {
    return;
  }

  await runtimeSendMessage({ type: 'PT_TRUST_DOMAIN', domain: lastResult.domain });
  settings.trustedDomains = [...new Set([...settings.trustedDomains, lastResult.domain])];
  await logAction('trust-domain', lastResult);
  destroyOverlay();
  await runScan('popup-action');
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
      void handleTrustDomain();
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

async function runScan(source: ScanSource): Promise<void> {
  if (scanInFlight) {
    return;
  }

  scanInFlight = true;

  try {
    await refreshSettings();
    if (!settings) {
      return;
    }

    const pageKey = createPageKey(window.location.href);
    const domain = getDomainFromUrl(window.location.href);
    const trusted = isTrustedDomain(domain, settings.trustedDomains);
    const ignored = sessionIgnores.includes(pageKey);

    if (trusted || ignored) {
      await reportResult(buildBypassResult(source, trusted, ignored));
      return;
    }

    const snapshot = collectPageSnapshot();
    const result = analyzePage(snapshot, settings, source);
    result.trusted = trusted;
    result.ignored = ignored;
    await reportResult(result);
  } catch (error) {
    console.error(`${metadata.productName} scan failed`, error);
  } finally {
    lastScanAt = Date.now();
    scanInFlight = false;
  }
}

function scheduleScan(source: ScanSource): void {
  const now = Date.now();
  const delay = Math.max(0, 1400 - (now - lastScanAt));

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

function observeMutations(): void {
  const observer = new MutationObserver((records) => {
    const meaningful = records.some((record) => record.addedNodes.length > 0 || record.type === 'attributes');
    if (meaningful) {
      scheduleScan('mutation');
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'aria-label', 'data-command', 'data-action']
  });
}

getExtensionApi().runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  if (message.type === 'PT_RESCAN_TAB') {
    sendResponse({ ok: true });
    return false;
  }

  if ((message as { type?: string }).type === 'PT_TRIGGER_SCAN') {
    scheduleScan('popup-action');
    sendResponse({ ok: true });
    return false;
  }

  return false;
});

patchHistory();
observeMutations();
void refreshSettings().then(() => runScan('initial'));
