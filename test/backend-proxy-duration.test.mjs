import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routeUrl = new URL('../app/api/backend/[...path]/route.js', import.meta.url);

test('backend proxy allows long-running receipt recognition requests', async () => {
  const source = await readFile(routeUrl, 'utf8');
  assert.match(source, /export const maxDuration = 60;/);
});
