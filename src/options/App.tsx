import { useEffect, useMemo, useRef, useState } from 'react';
import { metadata } from '@/shared/brand/metadata';
import { t } from '@/shared/i18n/messages';
import type { AppSettings, Language, LogEntry } from '@/shared/types';
import { Badge } from '@/ui/components/Badge';
import { Button } from '@/ui/components/Button';
import { Panel } from '@/ui/components/Panel';
import { runtimeSendMessage, consumePendingOptionsSection, type OptionsSection } from '@/shared/utils/browser';
import { defaultSettings } from '@/shared/storage/settingsStore';
import { normalizeDomain } from '@/shared/utils/domain';

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

export function OptionsApp(): JSX.Element {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sessionIgnores, setSessionIgnores] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [domainInput, setDomainInput] = useState('');
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
    jumpToSection(currentSection);
  }, []);

  async function persist(nextSettings: AppSettings): Promise<void> {
    const response = await runtimeSendMessage({
      type: 'PT_SAVE_SETTINGS',
      settings: nextSettings
    });
    setSettings(response.settings);
    setStatus(t(response.settings.language, 'options.save'));
  }

  async function addTrustedDomain(): Promise<void> {
    const normalized = normalizeDomain(domainInput);
    if (!normalized) {
      return;
    }

    const nextSettings: AppSettings = {
      ...settings,
      trustedDomains: [...new Set([...settings.trustedDomains, normalized])]
    };
    setDomainInput('');
    await persist(nextSettings);
  }

  async function removeTrustedDomain(domain: string): Promise<void> {
    const nextSettings: AppSettings = {
      ...settings,
      trustedDomains: settings.trustedDomains.filter((entry) => entry !== domain)
    };
    await persist(nextSettings);
  }

  async function clearLogsAction(): Promise<void> {
    await runtimeSendMessage({ type: 'PT_CLEAR_LOGS' });
    setLogs([]);
  }

  async function clearSessionIgnoresAction(): Promise<void> {
    await runtimeSendMessage({ type: 'PT_CLEAR_SESSION_IGNORES' });
    setSessionIgnores([]);
  }

  async function handleImportSettings(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const parsed = JSON.parse(await file.text()) as AppSettings;
      await persist({
        ...defaultSettings,
        ...parsed,
        enabledCategories: { ...defaultSettings.enabledCategories, ...parsed.enabledCategories }
      });
      setStatus(t(language, 'options.settingsImported'));
    } catch {
      setStatus(t(language, 'options.settingsImportFailed'));
    } finally {
      event.target.value = '';
    }
  }

  const categoryEntries = useMemo(() => Object.entries(settings.enabledCategories), [settings.enabledCategories]);

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
                variant={currentSection === section ? 'primary' : 'ghost'}
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
                  min={50}
                  max={1000}
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
              <div className="row">
                <input
                  className="text-input"
                  placeholder="example.org"
                  value={domainInput}
                  onChange={(event) => setDomainInput(event.target.value)}
                />
                <Button onClick={() => void addTrustedDomain()}>{t(language, 'popup.trust')}</Button>
              </div>
              <div className="list">
                {settings.trustedDomains.length === 0 ? <div className="muted">{t(language, 'options.noTrustedDomains')}</div> : null}
                {settings.trustedDomains.map((domain) => (
                  <div className="list-item row" key={domain}>
                    <span>{domain}</span>
                    <Button variant="ghost" onClick={() => void removeTrustedDomain(domain)}>
                      {t(language, 'options.remove')}
                    </Button>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div ref={(node) => { sectionRefs.current['session-ignores'] = node; }} id="session-ignores">
            <Panel>
              <strong>{t(language, 'options.sessionIgnores')}</strong>
              <div className="button-row">
                <Button variant="ghost" onClick={() => void clearSessionIgnoresAction()}>
                  {t(language, 'options.clearSessionIgnores')}
                </Button>
              </div>
              <div className="list">
                {sessionIgnores.length === 0 ? <div className="muted">{t(language, 'options.noSessionIgnores')}</div> : null}
                {sessionIgnores.map((item) => (
                  <div className="list-item code" key={item}>
                    {item}
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>

        <div ref={(node) => { sectionRefs.current.logs = node; }} id="logs">
          <Panel>
            <div className="row">
              <strong>{t(language, 'options.logs')}</strong>
              <div className="button-row">
                <Button variant="ghost" onClick={() => downloadJson('pastetrap-logs.json', logs)}>
                  {t(language, 'options.exportLogs')}
                </Button>
                <Button variant="ghost" onClick={() => void clearLogsAction()}>
                  {t(language, 'options.clearLogs')}
                </Button>
              </div>
            </div>
            <div className="list">
              {logs.length === 0 ? <div className="muted">{t(language, 'options.noLogs')}</div> : null}
              {logs.map((log) => (
                <div className="list-item stack" key={log.id}>
                  <div className="row">
                    <strong>{log.domain}</strong>
                    <Badge language={language} level={log.riskLevel} />
                  </div>
                  <div className="small muted">{new Date(log.timestamp).toLocaleString()}</div>
                  <div>{log.url}</div>
                  {log.commandPreview ? <div className="code">{log.commandPreview}</div> : null}
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid-two">
          <div>
            <Panel>
              <strong>{t(language, 'common.settings')}</strong>
              <div className="button-row">
                <Button variant="ghost" onClick={() => downloadJson('pastetrap-settings.json', settings)}>
                  {t(language, 'options.exportSettings')}
                </Button>
                <Button variant="ghost" onClick={() => importRef.current?.click()}>
                  {t(language, 'options.importSettings')}
                </Button>
              </div>
              <input ref={importRef} hidden type="file" accept="application/json" onChange={(event) => void handleImportSettings(event)} />
            </Panel>
          </div>

          <div>
            <div ref={(node) => { sectionRefs.current.privacy = node; }} id="privacy">
              <Panel>
                <strong>{t(language, 'options.privacy')}</strong>
                <div className="muted">{t(language, 'privacy.localOnly')}</div>
                <div className="muted">{t(language, 'privacy.noTelemetry')}</div>
              </Panel>
            </div>
            <div ref={(node) => { sectionRefs.current.about = node; }} id="about">
              <Panel>
                <strong>{t(language, 'options.about')}</strong>
                <div>{metadata.productName}</div>
                <div className="small muted">
                  {t(language, 'common.version')}: {chrome.runtime.getManifest().version}
                </div>
                <div className="small muted">Maintainer: {metadata.maintainer}</div>
                <div className="button-row">
                  <a className="button" href={metadata.urls.repository} target="_blank" rel="noreferrer">
                    Repo
                  </a>
                  <a className="button" href={metadata.urls.issues} target="_blank" rel="noreferrer">
                    Issues
                  </a>
                  <a className="button" href={metadata.urls.security} target="_blank" rel="noreferrer">
                    Security
                  </a>
                </div>
              </Panel>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
