import { metadata } from '@/shared/brand/metadata';
import type { RuntimeMessage, RuntimeResponseMap } from '@/shared/messages';
import { addLogEntry, clearLogs, getLogs } from '@/shared/storage/logsStore';
import {
  addSessionIgnore,
  clearSessionIgnores,
  getLatestState,
  getSessionIgnores,
  saveLatestState
} from '@/shared/storage/sessionStore';
import { getSettings, saveSettings } from '@/shared/storage/settingsStore';
import type { LatestTabState, LogEntry, ScanResult } from '@/shared/types';
import { normalizeDomain } from '@/shared/utils/domain';
import { getExtensionApi } from '@/shared/utils/browser';

function runtimeVersion(): string {
  return getExtensionApi().runtime.getManifest().version;
}

function buildScanLog(result: ScanResult, sensitivity: LogEntry['sensitivityProfile']): LogEntry {
  return {
    id: `log_${result.scanId}`,
    timestamp: result.timestamp,
    domain: result.domain,
    url: result.url,
    pageTitle: result.title,
    score: result.score,
    riskLevel: result.level,
    matchedSignals: result.matchedRules.map((rule) => rule.titleKey),
    matchedRules: result.matchedRules.map((rule) => rule.id),
    commandFingerprint: result.commands[0]?.fingerprint ?? null,
    commandPreview: result.commands[0]?.preview ?? null,
    userAction: 'scan',
    sensitivityProfile: sensitivity,
    extensionVersion: runtimeVersion(),
    source: result.source
  };
}

async function reportScan(result: ScanResult, tabId: number): Promise<void> {
  const settings = await getSettings();
  const state: LatestTabState = {
    tabId,
    url: result.url,
    domain: result.domain,
    result,
    updatedAt: new Date().toISOString()
  };

  await saveLatestState(state);

  if (result.level !== 'info') {
    await addLogEntry(buildScanLog(result, settings.sensitivity), settings.logLimit);
  }
}

async function logAction(entry: LogEntry): Promise<void> {
  const settings = await getSettings();
  await addLogEntry(entry, settings.logLimit);
}

async function trustDomain(domain: string): Promise<void> {
  const settings = await getSettings();
  settings.trustedDomains = [...new Set([...settings.trustedDomains, normalizeDomain(domain)])];
  await saveSettings(settings);
}

async function untrustDomain(domain: string): Promise<void> {
  const settings = await getSettings();
  settings.trustedDomains = settings.trustedDomains.filter((entry) => entry !== normalizeDomain(domain));
  await saveSettings(settings);
}

type RouterResponse<TMessage extends RuntimeMessage> = RuntimeResponseMap[TMessage['type']];

export async function handleRuntimeMessage<TMessage extends RuntimeMessage>(
  message: TMessage,
  sender: chrome.runtime.MessageSender
): Promise<RouterResponse<TMessage>> {
  switch (message.type) {
    case 'PT_GET_SETTINGS':
      return {
        settings: await getSettings(),
        sessionIgnores: await getSessionIgnores()
      } as RouterResponse<TMessage>;
    case 'PT_SAVE_SETTINGS':
      return { settings: await saveSettings(message.settings) } as RouterResponse<TMessage>;
    case 'PT_REPORT_SCAN': {
      const tabId = sender.tab?.id;
      if (typeof tabId === 'number') {
        await reportScan(message.result, tabId);
      }
      return { ok: true } as RouterResponse<TMessage>;
    }
    case 'PT_GET_PAGE_STATE':
      return { state: await getLatestState(message.tabId) } as RouterResponse<TMessage>;
    case 'PT_TRUST_DOMAIN':
      await trustDomain(message.domain);
      return { ok: true } as RouterResponse<TMessage>;
    case 'PT_UNTRUST_DOMAIN':
      await untrustDomain(message.domain);
      return { ok: true } as RouterResponse<TMessage>;
    case 'PT_IGNORE_PAGE':
      await addSessionIgnore(message.pageKey);
      return { ok: true } as RouterResponse<TMessage>;
    case 'PT_CLEAR_SESSION_IGNORES':
      await clearSessionIgnores();
      return { ok: true } as RouterResponse<TMessage>;
    case 'PT_LOG_ACTION':
      await logAction(message.entry);
      return { ok: true } as RouterResponse<TMessage>;
    case 'PT_GET_LOGS':
      return { logs: await getLogs() } as RouterResponse<TMessage>;
    case 'PT_CLEAR_LOGS':
      await clearLogs();
      return { ok: true } as RouterResponse<TMessage>;
    case 'PT_RESCAN_TAB': {
      await new Promise<void>((resolve, reject) => {
        getExtensionApi().tabs.sendMessage(message.tabId, { type: 'PT_TRIGGER_SCAN', source: 'popup-action' }, () => {
          const lastError = getExtensionApi().runtime.lastError;
          if (lastError) {
            reject(new Error(lastError.message));
            return;
          }

          resolve();
        });
      });
      return { ok: true } as RouterResponse<TMessage>;
    }
    case 'PT_GET_SESSION_IGNORES':
      return { sessionIgnores: await getSessionIgnores() } as RouterResponse<TMessage>;
    case 'PT_TRIGGER_SCAN':
      return { ok: true } as RouterResponse<TMessage>;
  }
}

export function formatRuntimeError(error: unknown): { ok: false; error: string; repository: string } {
  const safeMessage = error instanceof Error ? error.message : 'Unknown error';
  return {
    ok: false,
    error: safeMessage,
    repository: metadata.urls.repository
  };
}
