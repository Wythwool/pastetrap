import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const root = process.cwd();
const dist = path.join(root, 'dist');
const assetsDir = path.join(root, 'docs', 'assets');
await fs.mkdir(assetsDir, { recursive: true });

const server = spawn(process.execPath, ['scripts/demo-server.mjs'], { cwd: root, stdio: 'inherit' });
await new Promise((resolve) => setTimeout(resolve, 700));

try {
  const userDataDir = path.join(root, '.tmp-screenshots-profile');
  await fs.rm(userDataDir, { recursive: true, force: true });
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`]
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4177/fake-captcha-clickfix.html');
  await page.waitForSelector('#pastetrap-overlay-host', { timeout: 8000 });
  await page.screenshot({ path: path.join(assetsDir, 'overlay.png'), fullPage: true });

  const serviceWorker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const extensionId = new URL(serviceWorker.url()).host;
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.screenshot({ path: path.join(assetsDir, 'popup.png'), fullPage: true });

  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  await options.screenshot({ path: path.join(assetsDir, 'options.png'), fullPage: true });

  await context.close();
} finally {
  server.kill('SIGTERM');
}
