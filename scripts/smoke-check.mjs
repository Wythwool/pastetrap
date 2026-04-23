import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const packageJson = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
const manifestPath = path.join(dist, 'manifest.json');
const requiredFiles = ['manifest.json', 'background.js', 'content.js', 'popup.html', 'options.html'];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

for (const file of requiredFiles) {
  await fs.access(path.join(dist, file));
}

assert(manifest.manifest_version === 3, 'Manifest must be MV3.');
assert(manifest.version === packageJson.version, 'Manifest version must match package.json.');
assert(manifest.background?.service_worker === 'background.js', 'Missing background service worker.');
assert(manifest.action?.default_popup === 'popup.html', 'Missing popup.');
assert(manifest.options_page === 'options.html', 'Missing options page.');
assert(manifest.permissions?.includes('storage'), 'Missing storage permission.');
assert(manifest.permissions?.includes('activeTab'), 'Missing activeTab permission.');
assert(manifest.host_permissions?.includes('http://*/*'), 'Missing http host permission.');
assert(manifest.host_permissions?.includes('https://*/*'), 'Missing https host permission.');
assert(manifest.content_scripts?.[0]?.all_frames === true, 'Content script must run in all frames.');
assert(manifest.content_scripts?.[0]?.match_about_blank === true, 'Content script must match about:blank frames.');

console.log(`Smoke check passed for PasteTrap ${packageJson.version}.`);
