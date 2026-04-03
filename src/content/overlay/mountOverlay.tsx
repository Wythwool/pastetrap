import { createRoot, type Root } from 'react-dom/client';
import type { Language, ScanResult } from '@/shared/types';
import { OverlayApp } from '@/content/overlay/OverlayApp';
import overlayCss from '@/content/overlay/overlay.css?inline';

interface OverlayController {
  update: (language: Language, result: ScanResult) => void;
  destroy: () => void;
}

interface OverlayCallbacks {
  onBackToSafety: () => void;
  onIgnoreOnce: () => void;
  onTrustDomain: () => void;
  onCopyEvidence: () => void;
}

export function mountOverlay(
  language: Language,
  result: ScanResult,
  callbacks: OverlayCallbacks
): OverlayController {
  const host = document.createElement('div');
  host.id = 'pastetrap-overlay-host';
  const shadowRoot = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = overlayCss;
  shadowRoot.append(style);

  const container = document.createElement('div');
  shadowRoot.append(container);
  document.documentElement.append(host);

  const root: Root = createRoot(container);

  const render = (nextLanguage: Language, nextResult: ScanResult): void => {
    root.render(
      <OverlayApp
        language={nextLanguage}
        result={nextResult}
        onBackToSafety={callbacks.onBackToSafety}
        onIgnoreOnce={callbacks.onIgnoreOnce}
        onTrustDomain={callbacks.onTrustDomain}
        onCopyEvidence={callbacks.onCopyEvidence}
      />
    );
  };

  render(language, result);

  return {
    update: render,
    destroy: () => {
      root.unmount();
      host.remove();
    }
  };
}
