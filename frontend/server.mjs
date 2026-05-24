import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

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

function applyHardeningHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https: http://localhost:* http://127.0.0.1:*; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  );
}

function sendFile(response, filePath) {
  applyHardeningHeaders(response);
  response.setHeader('Content-Type', contentTypes[extname(filePath)] || 'application/octet-stream');
  createReadStream(filePath).pipe(response);
}

function resolveAssetPath(publicDir, pathname) {
  const decoded = decodeURIComponent(pathname.split('?')[0]);
  const normalizedPath = normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  return join(publicDir, normalizedPath === '/' ? 'index.html' : normalizedPath);
}

export function createFrontendServer({ publicDir = resolve('dist/frontend/browser') } = {}) {
  const resolvedPublicDir = resolve(publicDir);
  const indexFile = join(resolvedPublicDir, 'index.html');

  return createServer(async (request, response) => {
    applyHardeningHeaders(response);

    if (request.url === '/healthz') {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    const filePath = resolveAssetPath(resolvedPublicDir, request.url || '/');

    try {
      const fileStat = await stat(filePath);
      if (fileStat.isFile() && filePath.startsWith(resolvedPublicDir)) {
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
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 4200);
  const host = process.env.HOST || '0.0.0.0';
  const server = createFrontendServer();

  server.listen(port, host, () => {
    console.log(`Practice Planner frontend listening on ${host}:${port}`);
  });
}
