import { useEffect, useMemo, useRef, useState } from 'react';
import { metadata } from '@/shared/brand/metadata';
import { t } from '@/shared/i18n/messages';
import type { Language, ScanResult } from '@/shared/types';

interface OverlayAppProps {
  language: Language;
  result: ScanResult;
  onBackToSafety: () => void;
  onIgnoreOnce: () => void;
  onTrustDomain: () => void;
  onCopyEvidence: () => void;
}

function useFocusTrap(containerRef: React.RefObject<HTMLDivElement>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter((element) => !element.hasAttribute('disabled'));

    focusable[0]?.focus();

    const handleKeydown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab' || focusable.length === 0) {
        return;
      }

      const activeIndex = focusable.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey) {
        if (activeIndex <= 0) {
          focusable[focusable.length - 1]?.focus();
          event.preventDefault();
        }
        return;
      }

      if (activeIndex === focusable.length - 1) {
        focusable[0]?.focus();
        event.preventDefault();
      }
    };

    container.addEventListener('keydown', handleKeydown);
    return () => container.removeEventListener('keydown', handleKeydown);
  }, [containerRef]);
}

function buildEvidenceSummary(language: Language, result: ScanResult): string {
  const lines = [
    `${metadata.productName}`,
    `Domain: ${result.domain}`,
    `URL: ${result.url}`,
    `Risk: ${t(language, `common.risk.${result.level}`)}`,
    `Score: ${result.score}`,
    'Matched rules:'
  ];

  for (const match of result.matchedRules) {
    lines.push(`- ${t(language, match.titleKey)}`);
    for (const evidence of match.evidence.slice(0, 2)) {
      lines.push(`  * ${evidence}`);
    }
  }

  if (result.commands[0]) {
    lines.push('Command preview:');
    lines.push(result.commands[0].preview);
  }

  return lines.join('\n');
}

export function OverlayApp({
  language,
  result,
  onBackToSafety,
  onIgnoreOnce,
  onTrustDomain,
  onCopyEvidence
}: OverlayAppProps): JSX.Element {
  const panelRef = useRef<HTMLDivElement>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const titleKey = result.level === 'critical' ? 'overlay.title.critical' : 'overlay.title.high';

  useFocusTrap(panelRef);

  const reasonChips = useMemo(
    () => result.matchedRules.map((match) => t(language, match.titleKey)),
    [language, result.matchedRules]
  );

  const evidenceSummary = useMemo(() => buildEvidenceSummary(language, result), [language, result]);

  return (
    <div className="pt-root" role="presentation">
      <div className="pt-backdrop" />
      <div className="pt-panel" data-level={result.level} role="dialog" aria-modal="true" ref={panelRef}>
        <div className="pt-header">
          <div className="pt-title-row">
            <h1 className="pt-title">{t(language, titleKey)}</h1>
            <span className="pt-badge" data-level={result.level}>
              {t(language, `common.risk.${result.level}`)}
            </span>
          </div>
          <p className="pt-summary">{t(language, result.summaryKey)}</p>
          <p className="pt-explanation">{t(language, result.explanationKey)}</p>
        </div>

        <div className="pt-body">
          <section className="pt-section">
            <h2>{t(language, 'overlay.reasonList')}</h2>
            <div className="pt-chip-row">
              {reasonChips.map((chip) => (
                <span className="pt-chip" key={chip}>
                  {chip}
                </span>
              ))}
            </div>
          </section>

          {result.commands[0] ? (
            <section className="pt-section">
              <h2>{t(language, 'overlay.commandPreview')}</h2>
              <div className="pt-code">{result.commands[0].preview}</div>
            </section>
          ) : null}

          <section className="pt-section">
            <div className="pt-buttons">
              <button className="pt-button" data-variant="danger" onClick={onBackToSafety}>
                {t(language, 'overlay.back')}
              </button>
              <button className="pt-button" onClick={onIgnoreOnce}>
                {t(language, 'overlay.ignoreOnce')}
              </button>
              <button className="pt-button" onClick={onTrustDomain}>
                {t(language, 'overlay.trustDomain')}
              </button>
              <button className="pt-button" data-variant="ghost" onClick={() => setDetailsOpen((value) => !value)}>
                {detailsOpen ? t(language, 'overlay.hideDetails') : t(language, 'overlay.showDetails')}
              </button>
              <button className="pt-button" data-variant="ghost" onClick={() => {
                void navigator.clipboard.writeText(evidenceSummary);
                onCopyEvidence();
              }}>
                {t(language, 'overlay.copyEvidence')}
              </button>
            </div>
          </section>

          {detailsOpen ? (
            <section className="pt-section">
              <h2>{t(language, 'overlay.technical')}</h2>
              <div className="pt-rule-list">
                {result.matchedRules.map((match) => (
                  <article className="pt-card" key={match.id}>
                    <p className="pt-card-title">{t(language, match.titleKey)}</p>
                    <p className="pt-card-text">{t(language, match.technicalKey)}</p>
                    <div className="pt-chip-row">
                      {match.evidence.map((evidence) => (
                        <span className="pt-chip" key={`${match.id}:${evidence}`}>
                          {evidence}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
              <div className="pt-trace">
                {result.scoringTrace.map((trace) => (
                  <div className="pt-card pt-trace-item" key={`${trace.ruleId}:${trace.reason}`}>
                    <span>{trace.reason}</span>
                    <strong>+{trace.added}</strong>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
