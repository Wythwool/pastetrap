import { useEffect, useState } from 'react';
import { metadata } from '@/shared/brand/metadata';
import { t } from '@/shared/i18n/messages';
import type { AppSettings, Language, LatestTabState } from '@/shared/types';
import { describeTrustedRule, getDomainFromUrl, getTrustedRuleForUrl } from '@/shared/utils/domain';
import { openOptionsPage, queryActiveTab, runtimeSendMessage } from '@/shared/utils/browser';
import { Badge } from '@/ui/components/Badge';
import { Button } from '@/ui/components/Button';
import { Panel } from '@/ui/components/Panel';

export function PopupApp(): JSX.Element {
  const [language, setLanguage] = useState<Language>('en');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [state, setState] = useState<LatestTabState | null>(null);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [activeUrl, setActiveUrl] = useState('');
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [rescanning, setRescanning] = useState(false);
  const [error, setError] = useState('');

  async function loadState(): Promise<void> {
    setLoading(true);
    setError('');

    try {
      const [settingsResponse, activeTab] = await Promise.all([
        runtimeSendMessage({ type: 'PT_GET_SETTINGS' }),
        queryActiveTab()
      ]);

      setSettings(settingsResponse.settings);
      setLanguage(settingsResponse.settings.language);

      if (!activeTab?.id || !activeTab.url) {
        setError(t(settingsResponse.settings.language, 'popup.noTab'));
        setLoading(false);
        return;
      }

      setActiveTabId(activeTab.id);
      setActiveUrl(activeTab.url);
      setDomain(getDomainFromUrl(activeTab.url));

      const pageState = await runtimeSendMessage({
        type: 'PT_GET_PAGE_STATE',
        tabId: activeTab.id
      });

      setState(pageState.state);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : metadata.description);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadState();
  }, []);

  async function rescan(): Promise<void> {
    if (!activeTabId) {
      return;
    }

    setRescanning(true);
    setError('');
    try {
      const response = await runtimeSendMessage({ type: 'PT_RESCAN_TAB', tabId: activeTabId });
      if (response.state) {
        setState(response.state);
      }
      if (!response.state && response.scan) {
        await loadState();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : metadata.description);
    } finally {
      setRescanning(false);
    }
  }

  async function trustCurrentHost(): Promise<void> {
    if (!activeUrl) {
      return;
    }

    const response = await runtimeSendMessage({ type: 'PT_TRUST_SITE', url: activeUrl, scope: 'host' });
    setSettings(response.settings);
    await rescan();
  }

  async function trustCurrentPath(): Promise<void> {
    if (!activeUrl) {
      return;
    }

    const response = await runtimeSendMessage({ type: 'PT_TRUST_SITE', url: activeUrl, scope: 'path' });
    setSettings(response.settings);
    await rescan();
  }

  async function removeTrustForCurrentUrl(): Promise<void> {
    if (!activeUrl) {
      return;
    }

    const response = await runtimeSendMessage({ type: 'PT_UNTRUST_SITE_FOR_URL', url: activeUrl });
    setSettings(response.settings);
    await rescan();
  }

  const trustedRule = settings && activeUrl ? getTrustedRuleForUrl(activeUrl, settings) : null;
  const trustedLabel = trustedRule ? describeTrustedRule(trustedRule) : t(language, 'common.notTrusted');
  const matchedCount = state?.result.matchedRules.length ?? 0;
  const safeSummary = state ? t(language, state.result.summaryKey) : t(language, 'common.safe');
  const stateIsStale = Boolean(state && activeUrl && state.url !== activeUrl);

  return (
    <div className="app-shell" style={{ width: 380 }}>
      <div className="stack">
        <Panel>
          <div className="row">
            <div>
              <h1 className="title">{metadata.productName}</h1>
              <p className="subtitle">{metadata.description}</p>
            </div>
            {state ? <Badge language={language} level={state.result.level} /> : null}
          </div>
          <div>
            <div className="muted">{t(language, 'common.currentDomain')}</div>
            <div>{domain || '-'}</div>
            <div className="small muted">{trustedRule ? `${t(language, 'common.trusted')}: ${trustedLabel}` : t(language, 'common.notTrusted')}</div>
          </div>
        </Panel>

        <Panel>
          {loading ? <div>{t(language, 'common.loading')}</div> : null}
          {!loading && error ? <div>{error}</div> : null}
          {!loading && !error ? (
            <>
              <div className="row">
                <strong>{t(language, 'common.lastScan')}</strong>
                {state ? <Badge language={language} level={state.result.level} /> : null}
              </div>
              {stateIsStale ? <div className="small muted">{t(language, 'popup.stale')}</div> : null}
              <div>{safeSummary}</div>
              <div className="muted">
                {state ? `${matchedCount} ${t(language, 'popup.matchedSignals')}` : t(language, 'popup.safeDetails')}
              </div>
              {state?.result.commands[0] ? <div className="code">{state.result.commands[0].preview}</div> : null}
            </>
          ) : null}
        </Panel>

        <Panel>
          <div className="muted">{t(language, 'popup.checked')}</div>
          <div className="small muted">{t(language, 'popup.safeDetails')}</div>
          <div className="button-row">
            <Button onClick={() => void rescan()} disabled={rescanning}>
              {rescanning ? t(language, 'common.loading') : t(language, 'popup.rescan')}
            </Button>
            {trustedRule ? (
              <Button onClick={() => void removeTrustForCurrentUrl()}>{t(language, 'popup.untrust')}</Button>
            ) : (
              <>
                <Button onClick={() => void trustCurrentHost()}>{t(language, 'popup.trustHost')}</Button>
                <Button onClick={() => void trustCurrentPath()}>{t(language, 'popup.trustPath')}</Button>
              </>
            )}
            <Button variant="ghost" onClick={() => void openOptionsPage('logs')}>
              {t(language, 'common.openLogs')}
            </Button>
            <Button variant="ghost" onClick={() => void openOptionsPage('general')}>
              {t(language, 'common.openSettings')}
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
