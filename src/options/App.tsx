import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { metadata } from '@/shared/brand/metadata';
import { t } from '@/shared/i18n/messages';
import type { AppSettings, DetectionCategory, Language, LogEntry, SuppressRule } from '@/shared/types';
import { Badge } from '@/ui/components/Badge';
import { Button } from '@/ui/components/Button';
import { Panel } from '@/ui/components/Panel';
import { runtimeSendMessage, consumePendingOptionsSection, getExtensionApi, type OptionsSection } from '@/shared/utils/browser';
import { allCategories, createTrustedSiteRule, defaultSettings, normalizeSettings } from '@/shared/storage/settingsStore';
import { describeTrustedRule, normalizeDomain, normalizePathPrefix } from '@/shared/utils/domain';
import { createId } from '@/shared/utils/id';

const sectionLabelKey: Record<OptionsSection, string> = {
  general: 'options.general',
  categories: 'options.categories',
  'trusted-domains': 'options.trustedDomains',
  'session-ignores': 'options.sessionIgnores',
  logs: 'options.logs',
  privacy: 'options.privacy',
  about: 'options.about'
};

const sectionOrder: OptionsSection[] = [
  'general',
  'categories',
  'trusted-domains',
  'session-ignores',
  'logs',
  'privacy',
  'about'
];

function downloadJson(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function readInitialSection(): OptionsSection {
  const hash = window.location.hash.replace(/^#/, '') as OptionsSection;
  if (sectionOrder.includes(hash)) {
    return hash;
  }

  const pending = consumePendingOptionsSection();
  return pending && sectionOrder.includes(pending) ? pending : 'general';
}

function buildSuppressRule(hostInput: string, pathInput: string, category: DetectionCategory): SuppressRule | null {
  const host = normalizeDomain(hostInput);
  if (!host) {
    return null;
  }

  const pathPrefix = normalizePathPrefix(pathInput || '/');
  return {
    id: createId('suppress', `${host}:${pathPrefix}:${category}`),
    host,
    pathPrefix,
    category,
    createdAt: new Date().toISOString()
  };
}

export function OptionsApp(): JSX.Element {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sessionIgnores, setSessionIgnores] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [trustInput, setTrustInput] = useState('');
  const [trustPathOnly, setTrustPathOnly] = useState(false);
  const [trustSubdomains, setTrustSubdomains] = useState(false);
  const [suppressHostInput, setSuppressHostInput] = useState('');
  const [suppressPathInput, setSuppressPathInput] = useState('/');
  const [suppressCategory, setSuppressCategory] = useState<DetectionCategory>('fake-verification');
  const [currentSection, setCurrentSection] = useState<OptionsSection>(() => readInitialSection());
  const importRef = useRef<HTMLInputElement | null>(null);
  const sectionRefs = useRef<Record<OptionsSection, HTMLDivElement | null>>({
    general: null,
    categories: null,
    'trusted-domains': null,
    'session-ignores': null,
    logs: null,
    privacy: null,
    about: null
  });

  const language = settings.language;
  const extensionVersion = getExtensionApi().runtime.getManifest().version;

  async function load(): Promise<void> {
    const [settingsResponse, logsResponse, ignoresResponse] = await Promise.all([
      runtimeSendMessage({ type: 'PT_GET_SETTINGS' }),
      runtimeSendMessage({ type: 'PT_GET_LOGS' }),
      runtimeSendMessage({ type: 'PT_GET_SESSION_IGNORES' })
    ]);

    setSettings(settingsResponse.settings);
    setLogs(logsResponse.logs);
    setSessionIgnores(ignoresResponse.sessionIgnores);
  }

  function jumpToSection(section: OptionsSection): void {
    setCurrentSection(section);
    window.location.hash = section;
    sectionRefs.current[section]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    sectionRefs.current[currentSection]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentSection]);

  async function persist(nextSettings: AppSettings): Promise<void> {
    const response = await runtimeSendMessage({
      type: 'PT_SAVE_SETTINGS',
      settings: nextSettings
    });
    setSettings(response.settings);
    setStatus(t(response.settings.language, 'options.save'));
  }

  async function addTrustedSite(scopeOverride?: 'host' | 'path'): Promise<void> {
    const scope = scopeOverride ?? (trustPathOnly ? 'path' : 'host');
    const rule = createTrustedSiteRule(trustInput, scope, trustSubdomains);
    if (!rule) {
      setStatus(t(language, 'options.invalidTrustRule'));
      return;
    }

    setTrustInput('');
    await persist(normalizeSettings({
      ...settings,
      trustedSites: [...settings.trustedSites, rule]
    }));
  }

  async function removeTrustedSite(ruleId: string): Promise<void> {
    await persist(normalizeSettings({
      ...settings,
      trustedSites: settings.trustedSites.filter((entry) => entry.id !== ruleId),
      trustedDomains: settings.trustedDomains.filter((domain) => !settings.trustedSites.some((rule) => rule.id === ruleId && rule.host === domain))
    }));
  }

  async function addSuppression(): Promise<void> {
    const rule = buildSuppressRule(suppressHostInput, suppressPathInput, suppressCategory);
    if (!rule) {
      setStatus(t(language, 'options.invalidSuppressRule'));
      return;
    }

    setSuppressHostInput('');
    setSuppressPathInput('/');
    await persist(normalizeSettings({
      ...settings,
      suppressRules: [...settings.suppressRules, rule]
    }));
  }

  async function removeSuppression(ruleId: string): Promise<void> {
    await persist(normalizeSettings({
      ...settings,
      suppressRules: settings.suppressRules.filter((rule) => rule.id !== ruleId)
    }));
  }

  async function clearLogsAction(): Promise<void> {
    await runtimeSendMessage({ type: 'PT_CLEAR_LOGS' });
    setLogs([]);
  }

  async function clearSessionIgnoresAction(): Promise<void> {
    await runtimeSendMessage({ type: 'PT_CLEAR_SESSION_IGNORES' });
    setSessionIgnores([]);
  }

  async function handleImportSettings(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      await persist(normalizeSettings(parsed));
      setStatus(t(language, 'options.settingsImported'));
    } catch {
      setStatus(t(language, 'options.settingsImportFailed'));
    } finally {
      event.target.value = '';
    }
  }

  const categoryEntries = useMemo(
    () => allCategories.map((category) => [category, settings.enabledCategories[category]] as const),
    [settings.enabledCategories]
  );

  return (
    <div className="app-shell">
      <div className="stack">
        <Panel>
          <div className="row">
            <div>
              <h1 className="title">{metadata.productName}</h1>
              <p className="subtitle">{metadata.description}</p>
            </div>
            <div className="muted">{status}</div>
          </div>
          <div className="button-row" style={{ flexWrap: 'wrap' }}>
            {sectionOrder.map((section) => (
              <Button
                key={section}
                variant={currentSection === section ? 'default' : 'ghost'}
                onClick={() => jumpToSection(section)}
              >
                {t(language, sectionLabelKey[section])}
              </Button>
            ))}
          </div>
        </Panel>

        <div className="grid-two">
          <div ref={(node) => { sectionRefs.current.general = node; }} id="general">
            <Panel>
              <strong>{t(language, 'options.general')}</strong>
              <div className="small muted">{t(language, 'options.schemaVersion')}: {settings.schemaVersion}</div>
              <label className="stack">
                <span>{t(language, 'options.sensitivity')}</span>
                <select
                  className="select"
                  value={settings.sensitivity}
                  onChange={(event) => void persist({ ...settings, sensitivity: event.target.value as AppSettings['sensitivity'] })}
                >
                  <option value="low">low</option>
                  <option value="balanced">balanced</option>
                  <option value="strict">strict</option>
                </select>
              </label>
              <label className="stack">
                <span>{t(language, 'options.language')}</span>
                <select
                  className="select"
                  value={settings.language}
                  onChange={(event) => void persist({ ...settings, language: event.target.value as Language })}
                >
                  <option value="en">English</option>
                  <option value="ru">Русский</option>
                </select>
              </label>
              <label className="stack">
                <span>{t(language, 'options.logRetention')}</span>
                <input
                  className="text-input"
                  type="number"
                  min={25}
                  max={2000}
                  value={settings.logLimit}
                  onChange={(event) => void persist({ ...settings, logLimit: Number(event.target.value) || settings.logLimit })}
                />
              </label>
            </Panel>
          </div>

          <div ref={(node) => { sectionRefs.current.categories = node; }} id="categories">
            <Panel>
              <strong>{t(language, 'options.categories')}</strong>
              <div className="list">
                {categoryEntries.map(([category, enabled]) => (
                  <label className="list-item row" key={category}>
                    <span>{t(language, `category.${category}`)}</span>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(event) =>
                        void persist({
                          ...settings,
                          enabledCategories: {
                            ...settings.enabledCategories,
                            [category]: event.target.checked
                          }
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            </Panel>
          </div>
        </div>

        <div className="grid-two">
          <div ref={(node) => { sectionRefs.current['trusted-domains'] = node; }} id="trusted-domains">
            <Panel>
              <strong>{t(language, 'options.trustedDomains')}</strong>
              <div className="small muted">{t(language, 'options.trustedSitesHelp')}</div>
              <div className="stack">
                <input
                  className="text-input"
                  placeholder={t(language, 'options.trustedInput')}
                  value={trustInput}
                  onChange={(event) => setTrustInput(event.target.value)}
                />
                <label className="row list-item">
                  <span>{t(language, 'options.includeSubdomains')}</span>
                  <input type="checkbox" checked={trustSubdomains} onChange={(event) => setTrustSubdomains(event.target.checked)} />
                </label>
                <label className="row list-item">
                  <span>{t(language, 'options.trustCurrentPath')}</span>
                  <input type="checkbox" checked={trustPathOnly} onChange={(event) => setTrustPathOnly(event.target.checked)} />
                </label>
                <div className="button-row">
                  <Button onClick={() => void addTrustedSite('host')}>{t(language, 'options.trustExactHost')}</Button>
                  <Button onClick={() => void addTrustedSite('path')}>{t(language, 'options.trustCurrentPath')}</Button>
                </div>
              </div>
              <div className="list">
                {settings.trustedSites.length === 0 ? <div className="muted">{t(language, 'options.noTrustedDomains')}</div> : null}
                {settings.trustedSites.map((rule) => (
                  <div className="list-item row" key={rule.id}>
                    <span>{describeTrustedRule(rule)}</span>
                    <Button variant="ghost" onClick={() => void removeTrustedSite(rule.id)}>
                      {t(language, 'options.remove')}
                    </Button>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <Panel>
            <strong>{t(language, 'options.suppressions')}</strong>
            <div className="small muted">{t(language, 'options.suppressionsHelp')}</div>
            <div className="stack">
              <input
                className="text-input"
                placeholder="example.org"
                value={suppressHostInput}
                onChange={(event) => setSuppressHostInput(event.target.value)}
              />
              <input
                className="text-input"
                placeholder="/docs"
                value={suppressPathInput}
                onChange={(event) => setSuppressPathInput(event.target.value)}
              />
              <select className="select" value={suppressCategory} onChange={(event) => setSuppressCategory(event.target.value as DetectionCategory)}>
                {allCategories.map((category) => (
                  <option value={category} key={category}>{t(language, `category.${category}`)}</option>
                ))}
              </select>
              <Button onClick={() => void addSuppression()}>{t(language, 'options.addSuppression')}</Button>
            </div>
            <div className="list">
              {settings.suppressRules.length === 0 ? <div className="muted">{t(language, 'options.noSuppressions')}</div> : null}
              {settings.suppressRules.map((rule) => (
                <div className="list-item row" key={rule.id}>
                  <span>{rule.host}{rule.pathPrefix} · {t(language, `category.${rule.category}`)}</span>
                  <Button variant="ghost" onClick={() => void removeSuppression(rule.id)}>
                    {t(language, 'options.remove')}
                  </Button>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid-two">
          <div ref={(node) => { sectionRefs.current['session-ignores'] = node; }} id="session-ignores">
            <Panel>
              <strong>{t(language, 'options.sessionIgnores')}</strong>
              <div className="button-row">
                <Button onClick={() => void clearSessionIgnoresAction()}>{t(language, 'options.clearSessionIgnores')}</Button>
              </div>
              <div className="list">
                {sessionIgnores.length === 0 ? <div className="muted">{t(language, 'options.noSessionIgnores')}</div> : null}
                {sessionIgnores.map((ignore) => <div className="list-item" key={ignore}>{ignore}</div>)}
              </div>
            </Panel>
          </div>

          <div ref={(node) => { sectionRefs.current.logs = node; }} id="logs">
            <Panel>
              <strong>{t(language, 'options.logs')}</strong>
              <div className="button-row">
                <Button onClick={() => downloadJson('pastetrap-logs.json', logs)}>{t(language, 'options.exportLogs')}</Button>
                <Button variant="danger" onClick={() => void clearLogsAction()}>{t(language, 'options.clearLogs')}</Button>
              </div>
              <div className="list">
                {logs.length === 0 ? <div className="muted">{t(language, 'options.noLogs')}</div> : null}
                {logs.slice(0, 80).map((log) => (
                  <div className="list-item" key={log.id}>
                    <div className="row">
                      <strong>{log.domain}</strong>
                      <Badge language={language} level={log.riskLevel} />
                    </div>
                    <div className="small muted">{new Date(log.timestamp).toLocaleString()} · {log.userAction}</div>
                    <div className="small muted">{log.url}</div>
                    {log.commandPreview ? <div className="code">{log.commandPreview}</div> : null}
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>

        <div className="grid-two">
          <div ref={(node) => { sectionRefs.current.privacy = node; }} id="privacy">
            <Panel>
              <strong>{t(language, 'options.privacy')}</strong>
              <p>{t(language, 'privacy.localOnly')}</p>
              <p>{t(language, 'privacy.noTelemetry')}</p>
              <div className="button-row">
                <Button onClick={() => downloadJson('pastetrap-settings.json', settings)}>{t(language, 'options.exportSettings')}</Button>
                <Button onClick={() => importRef.current?.click()}>{t(language, 'options.importSettings')}</Button>
                <input ref={importRef} hidden type="file" accept="application/json" onChange={(event) => void handleImportSettings(event)} />
              </div>
            </Panel>
          </div>

          <div ref={(node) => { sectionRefs.current.about = node; }} id="about">
            <Panel>
              <strong>{t(language, 'options.about')}</strong>
              <p>{metadata.description}</p>
              <p className="small muted">{t(language, 'common.version')}: {extensionVersion}</p>
              <p className="small muted">{metadata.urls.repository}</p>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
