import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
const metadata = JSON.parse(await fs.readFile(path.join(root, 'project-metadata.json'), 'utf8'));

const manifest = {
  manifest_version: 3,
  name: metadata.productName,
  version: packageJson.version,
  description: packageJson.description,
  action: {
    default_title: metadata.productName,
    default_popup: 'popup.html'
  },
  options_page: 'options.html',
  background: {
    service_worker: 'background.js',
    type: 'module'
  },
  permissions: ['storage', 'activeTab'],
  host_permissions: ['http://*/*', 'https://*/*'],
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*'],
      js: ['content.js'],
      run_at: 'document_idle',
      all_frames: true,
      match_about_blank: true
    }
  ],
  icons: {
    '16': 'icons/icon-16.svg',
    '32': 'icons/icon-32.svg',
    '48': 'icons/icon-48.svg',
    '128': 'icons/icon-128.svg'
  }
};

await fs.mkdir(path.join(root, 'public'), { recursive: true });
await fs.writeFile(path.join(root, 'public', 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
