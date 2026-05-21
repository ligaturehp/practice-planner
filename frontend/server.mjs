import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const port = Number(process.env.PORT || 4200);
const host = process.env.HOST || '0.0.0.0';
const publicDir = resolve('dist/frontend/browser');
const indexFile = join(publicDir, 'index.html');

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

function sendFile(response, filePath) {
  response.setHeader('Content-Type', contentTypes[extname(filePath)] || 'application/octet-stream');
  createReadStream(filePath).pipe(response);
}

function resolveAssetPath(pathname) {
  const decoded = decodeURIComponent(pathname.split('?')[0]);
  const normalizedPath = normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  return join(publicDir, normalizedPath === '/' ? 'index.html' : normalizedPath);
}

const server = createServer(async (request, response) => {
  if (request.url === '/healthz') {
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  const filePath = resolveAssetPath(request.url || '/');

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isFile() && filePath.startsWith(publicDir)) {
      sendFile(response, filePath);
      return;
    }
  } catch {
    // Fall through to Angular's client-side router.
  }

  if (!existsSync(indexFile)) {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Angular build output not found. Run npm run build first.');
    return;
  }

  sendFile(response, indexFile);
});

server.listen(port, host, () => {
  console.log(`Practice Planner frontend listening on ${host}:${port}`);
});
