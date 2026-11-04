import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('location API uses supported Photon parameters, recognizes hotel buildings, and retries empty results', async (t) => {
  const source = (await readFile(new URL('../app/api/locations/route.js', import.meta.url), 'utf8'))
    .replace("import { NextResponse } from 'next/server';", 'const NextResponse = { json: (body, options) => ({ body, options }) };');
  const { GET } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let attempts = 0;
  globalThis.fetch = async (url) => {
    assert.equal(new URL(url).searchParams.has('lang'), false);
    attempts++;
    return { ok: true, json: async () => ({ features: attempts === 1 ? [] : [{
      properties: { name: 'Hilton Cologne', type: 'house', osm_value: 'hotel', osm_id: 328264591 },
      geometry: { coordinates: [6.9554425, 50.9432931] },
    }] }) };
  };
  const request = { url: 'http://localhost/api/locations?q=Hilton%20Cologne%20retry-regression' };
  const first = await GET(request);
  assert.equal(first.options.headers['Cache-Control'], 'no-store');
  const second = await GET(request);
  assert.equal(attempts, 2);
  assert.equal(second.body.results[0].kind, 'Отель');
  assert.equal(second.body.results[0].lat, 50.9432931);
  assert.equal(second.body.results[0].lon, 6.9554425);
});
