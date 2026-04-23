import { describe, expect, it } from 'vitest';
import { analyzePage } from '@/shared/detection/engine';
import { collectPageSnapshot } from '@/content/pageCollector';
import { defaultSettings } from '@/shared/storage/settingsStore';

function mountPage(html: string, url = 'https://demo.test/'): void {
  document.documentElement.innerHTML = html;
  window.history.replaceState({}, '', url);
  document.title = 'Mounted test page';
}

describe('page collection and analysis', () => {
  it('downgrades normal developer docs with shell snippets', () => {
    mountPage(`
      <html>
        <head>
          <meta name="description" content="Developer documentation quick start" />
          <title>CLI quick start docs</title>
        </head>
        <body>
          <main>
            <h1>Install guide</h1>
            <pre>npm install vitest react vite</pre>
            <pre>pnpm add @types/node</pre>
          </main>
        </body>
      </html>
    `, 'https://docs.example.test/setup');

    const snapshot = collectPageSnapshot();
    const result = analyzePage(snapshot, defaultSettings, 'initial');

    expect(result.level).toBe('info');
    expect(result.matchedRules.map((rule) => rule.id)).toContain('developer-doc-context');
  });

  it('still escalates a fake verification page with a copied powershell chain', () => {
    mountPage(`
      <html>
        <head>
          <title>Human verification</title>
        </head>
        <body>
          <div class="captcha-box">
            <p>Verify you are human to continue.</p>
            <button>Copy</button>
            <pre>powershell -w hidden -EncodedCommand SQBFAFgAIAAoAEkAbgB2AG8AawBlAC0ARQB4AHAAcgBlAHMAcwBpAG8AbgApAA==</pre>
            <p>Press Win+R, paste the command and hit Enter.</p>
          </div>
        </body>
      </html>
    `, 'https://evil.test/fake-check');

    const snapshot = collectPageSnapshot();
    const result = analyzePage(snapshot, defaultSettings, 'initial');

    expect(result.level).toBe('critical');
    expect(result.matchedRules.map((rule) => rule.id)).toContain('encoded-payload');
  });
});
