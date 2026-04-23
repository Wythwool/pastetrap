import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import archiver from 'archiver';

const root = process.cwd();
const packageJson = JSON.parse(await fsp.readFile(path.join(root, 'package.json'), 'utf8'));
const releaseDir = path.join(root, 'release');
const zipPath = path.join(releaseDir, `pastetrap-${packageJson.version}.zip`);
const manifestPath = path.join(releaseDir, `pastetrap-${packageJson.version}.release.json`);

await fsp.mkdir(releaseDir, { recursive: true });

await new Promise((resolve, reject) => {
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', resolve);
  archive.on('error', reject);
  archive.pipe(output);
  archive.directory(path.join(root, 'dist'), false);
  archive.finalize();
});

const zipBytes = await fsp.readFile(zipPath);
const sha256 = crypto.createHash('sha256').update(zipBytes).digest('hex');
await fsp.writeFile(
  manifestPath,
  `${JSON.stringify({ version: packageJson.version, artifact: path.basename(zipPath), sha256, size: zipBytes.length, createdAt: new Date().toISOString() }, null, 2)}\n`
);

console.log(`Wrote ${zipPath}`);
console.log(`Wrote ${manifestPath}`);
