import { useEffect, useState } from 'react';
import { metadata } from '@/shared/brand/metadata';
import { t } from '@/shared/i18n/messages';
import type { Language, LatestTabState } from '@/shared/types';
import { getDomainFromUrl, isTrustedDomain } from '@/shared/utils/domain';
import { openOptionsPage, queryActiveTab, runtimeSendMessage } from '@/shared/utils/browser';
import { Badge } from '@/ui/components/Badge';
import { Button } from '@/ui/components/Button';
import { Panel } from '@/ui/components/Panel';

export function PopupApp(): JSX.Element {
  const [language, setLanguage] = useState<Language>('en');
  const [state, setState] = useState<LatestTabState | null>(null);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [domain, setDomain] = useState('');
  const [trusted, setTrusted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadState(): Promise<void> {
    setLoading(true);
    setError('');

    try {
      const [settingsResponse, activeTab] = await Promise.all([
        runtimeSendMessage({ type: 'PT_GET_SETTINGS' }),
        queryActiveTab()
      ]);

      setLanguage(settingsResponse.settings.language);

      if (!activeTab?.id || !activeTab.url) {
        setError(t(settingsResponse.settings.language, 'popup.noTab'));
        setLoading(false);
        return;
      }

      const nextDomain = getDomainFromUrl(activeTab.url);
      setActiveTabId(activeTab.id);
      setDomain(nextDomain);
      setTrusted(isTrustedDomain(nextDomain, settingsResponse.settings.trustedDomains));

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

    await runtimeSendMessage({ type: 'PT_RESCAN_TAB', tabId: activeTabId });
    await loadState();
  }

  async function trustDomain(): Promise<void> {
    if (!domain) {
      return;
    }

    await runtimeSendMessage({ type: 'PT_TRUST_DOMAIN', domain });
    setTrusted(true);
    await loadState();
  }

  async function untrustDomain(): Promise<void> {
    if (!domain) {
      return;
    }

    await runtimeSendMessage({ type: 'PT_UNTRUST_DOMAIN', domain });
    setTrusted(false);
    await loadState();
  }

  const matchedCount = state?.result.matchedRules.length ?? 0;
  const safeSummary = state ? t(language, state.result.summaryKey) : t(language, 'common.safe');

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
            <div className="small muted">{trusted ? t(language, 'common.trusted') : t(language, 'common.notTrusted')}</div>
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
              <div>{safeSummary}</div>
              <div className="muted">
                {state ? `${matchedCount} matched signals` : t(language, 'popup.safeDetails')}
              </div>
              {state?.result.commands[0] ? <div className="code">{state.result.commands[0].preview}</div> : null}
            </>
          ) : null}
        </Panel>

        <Panel>
          <div className="muted">{t(language, 'popup.checked')}</div>
          <div className="small muted">{t(language, 'popup.safeDetails')}</div>
          <div className="button-row">
            <Button onClick={() => void rescan()}>{t(language, 'popup.rescan')}</Button>
            {trusted ? (
              <Button onClick={() => void untrustDomain()}>{t(language, 'popup.untrust')}</Button>
            ) : (
              <Button onClick={() => void trustDomain()}>{t(language, 'popup.trust')}</Button>
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
