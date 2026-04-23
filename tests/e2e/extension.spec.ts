import path from 'node:path';
import { chromium, expect, test, type BrowserContext, type Page, type TestInfo } from '@playwright/test';

interface ExtensionHarness {
  context: BrowserContext;
  extensionId: string;
  page: Page;
}

async function launchExtension(testInfo: TestInfo): Promise<ExtensionHarness> {
  const root = path.resolve(__dirname, '..', '..');
  const dist = path.join(root, 'dist');
  const userDataDir = testInfo.outputPath('profile');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`]
  });
  const serviceWorker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const extensionId = new URL(serviceWorker.url()).host;
  const page = await context.newPage();
  return { context, extensionId, page };
}

test.describe('browser extension e2e', () => {
  test('blocks a fake captcha ClickFix page and refreshes popup state after rescan', async ({}, testInfo) => {
    const harness = await launchExtension(testInfo);
    try {
      await harness.page.goto('/fake-captcha-clickfix.html');
      await expect(harness.page.locator('#pastetrap-overlay-host')).toBeAttached({ timeout: 10_000 });

      const popup = await harness.context.newPage();
      await popup.goto(`chrome-extension://${harness.extensionId}/popup.html`);
      await expect(popup.getByText(/PasteTrap/)).toBeVisible();
      await popup.getByRole('button', { name: /Rescan page|Проверить заново/ }).click();
      await expect(popup.getByText(/matched signals|совпавших сигналов/)).toBeVisible();
    } finally {
      await harness.context.close();
    }
  });

  test('detects verification bait delivered through an iframe', async ({}, testInfo) => {
    const harness = await launchExtension(testInfo);
    try {
      await harness.page.goto('/iframe-parent.html');
      await expect(harness.page.locator('#pastetrap-overlay-host')).toBeAttached({ timeout: 10_000 });
      await expect(harness.page.frameLocator('iframe').getByText(/PowerShell|Win\+R/)).toBeVisible();
    } finally {
      await harness.context.close();
    }
  });

  test('rescans SPA lazy-loaded shadow DOM content', async ({}, testInfo) => {
    const harness = await launchExtension(testInfo);
    try {
      await harness.page.goto('/spa-lazy-shadow.html');
      await harness.page.getByRole('button', { name: /Load verification step/ }).click();
      await expect(harness.page.locator('#pastetrap-overlay-host')).toBeAttached({ timeout: 10_000 });
    } finally {
      await harness.context.close();
    }
  });

  test('handles redirects and long pages', async ({}, testInfo) => {
    const harness = await launchExtension(testInfo);
    try {
      await harness.page.goto('/redirect-clickfix.html');
      await expect(harness.page).toHaveURL(/long-page-clickfix\.html/);
      await expect(harness.page.locator('#pastetrap-overlay-host')).toBeAttached({ timeout: 10_000 });
    } finally {
      await harness.context.close();
    }
  });

  test('saves granular trust and suppression rules in options UI', async ({}, testInfo) => {
    const harness = await launchExtension(testInfo);
    try {
      const options = await harness.context.newPage();
      await options.goto(`chrome-extension://${harness.extensionId}/options.html#trusted-domains`);
      await options.getByPlaceholder(/example\.org/).first().fill('https://docs.example.org/install');
      await options.getByRole('button', { name: /Trust path only|Доверять только path/ }).click();
      await expect(options.getByText(/docs\.example\.org\/install/)).toBeVisible();

      await options.getByPlaceholder('example.org').last().fill('docs.example.org');
      await options.getByPlaceholder('/docs').fill('/install');
      await options.getByRole('button', { name: /Add suppression|Добавить suppression/ }).click();
      await expect(options.getByText(/docs\.example\.org\/install/)).toHaveCount(2);
    } finally {
      await harness.context.close();
    }
  });
});
