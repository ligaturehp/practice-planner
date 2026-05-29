import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { createFrontendServer } from './server.mjs';

let server;
let baseUrl;
let cwd;

before(async () => {
  cwd = await mkdtemp(join(tmpdir(), 'practice-planner-server-'));
  const publicDir = join(cwd, 'dist/frontend/browser');
  await mkdir(publicDir, { recursive: true });
  await writeFile(join(publicDir, 'index.html'), '<!doctype html><title>Practice Planner</title>');

  server = createFrontendServer({ publicDir });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
  if (cwd) {
    await rm(cwd, { force: true, recursive: true });
  }
});

test('frontend server returns health status', async () => {
  const response = await fetch(`${baseUrl}/healthz`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('frontend server applies browser hardening headers', async () => {
  const response = await fetch(`${baseUrl}/`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.match(response.headers.get('content-security-policy') || '', /default-src 'self'/);
});

test('frontend server returns an empty Wails browser shim instead of SPA HTML', async () => {
  const response = await fetch(`${baseUrl}/wails/custom.js`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /text\/javascript/);
  assert.equal(await response.text(), '');

  const runtimeResponse = await fetch(`${baseUrl}/wails/runtime`);
  assert.equal(runtimeResponse.status, 200);
  assert.match(runtimeResponse.headers.get('content-type') || '', /text\/javascript/);
  assert.equal(await runtimeResponse.text(), '');
});

test('day details drawer keeps a bounded scroll container across responsive layouts', async () => {
  const styles = await readFile(new URL('./src/styles.css', import.meta.url), 'utf8');

  assert.match(
    styles,
    /\.inspector-drawer\s*{[^}]*position:\s*fixed;[^}]*height:\s*calc\(100vh - 32px\);[^}]*overflow:\s*hidden;[^}]*overscroll-behavior:\s*contain;/s,
  );
  assert.match(
    styles,
    /\.planning-drawer-body\s*{[^}]*overflow-y:\s*auto;[^}]*overscroll-behavior:\s*contain;/s,
  );
  assert.match(
    styles,
    /\.block-panel:not\(\.planning-drawer\)\s*{[^}]*position:\s*static;[^}]*max-height:\s*none;/s,
  );
  assert.match(
    styles,
    /\.planning-drawer\s*{[^}]*position:\s*fixed;[^}]*bottom:\s*12px;[^}]*height:\s*calc\(100vh - 24px\);/s,
  );
});
