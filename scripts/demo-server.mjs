import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const demoRoot = path.join(root, 'demo');
const port = 4177;

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8'
};

const server = http.createServer(async (request, response) => {
  const rawUrl = request.url ?? '/';
  const safePath = rawUrl === '/' ? '/index.html' : rawUrl;
  const filePath = path.normalize(path.join(demoRoot, safePath));

  if (!filePath.startsWith(demoRoot)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    response.writeHead(200, { 'Content-Type': contentTypes[ext] ?? 'text/plain; charset=utf-8' });
    response.end(file);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Demo pages: http://127.0.0.1:${port}`);
});
