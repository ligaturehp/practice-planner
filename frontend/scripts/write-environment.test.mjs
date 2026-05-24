import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { writeEnvironment } from './write-environment.mjs';

test('writeEnvironment rejects missing production API URL', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'practice-planner-env-'));
  try {
    await assert.rejects(
      () => writeEnvironment({ cwd, env: {} }),
      /API_BASE_URL/,
    );
  } finally {
    await rm(cwd, { force: true, recursive: true });
  }
});

test('writeEnvironment rejects placeholder production API URL', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'practice-planner-env-'));
  try {
    await assert.rejects(
      () =>
        writeEnvironment({
          cwd,
          env: { API_BASE_URL: 'https://your-practice-planner-api.up.railway.app' },
        }),
      /placeholder/,
    );
  } finally {
    await rm(cwd, { force: true, recursive: true });
  }
});

test('writeEnvironment writes an explicit production API URL', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'practice-planner-env-'));
  try {
    const filePath = await writeEnvironment({
      cwd,
      env: { API_BASE_URL: 'https://api.example.com' },
    });
    const contents = await readFile(filePath, 'utf8');
    assert.match(contents, /production: true/);
    assert.match(contents, /https:\/\/api\.example\.com/);
  } finally {
    await rm(cwd, { force: true, recursive: true });
  }
});
