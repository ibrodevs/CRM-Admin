import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingApi } from '../src/modules/orders/api/bookingApi.js';

test('booking recovery, status inquiry and void are distinct explicit API actions', async () => {
  const original = globalThis.fetch, calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url: String(url), body: JSON.parse(options.body), method: options.method }); return new Response(JSON.stringify({ job_id: 'fixture-job' }), { headers: { 'Content-Type': 'application/json' } }); };
  try {
    await bookingApi.inquiry('workflow', 'item');
    await bookingApi.resume('workflow', 'item');
    await bookingApi.void('workflow', 'item');
    assert.match(calls[0].url, /status-inquiry\/?$/);
    assert.match(calls[1].url, /resume\/?$/);
    assert.match(calls[2].url, /void\/?$/);
    assert.deepEqual(calls[1].body, { item: 'item' });
    assert.deepEqual(calls[2].body, { item: 'item', confirm: true });
    assert.equal(calls.every((c) => c.method === 'POST'), true);
  } finally { globalThis.fetch = original; }
});

test('transfer cancellation submits the server quote confirmation instead of a client price', async () => {
  const original = globalThis.fetch, calls = [];
  globalThis.fetch = async (url, options) => { calls.push(JSON.parse(options.body)); return new Response(JSON.stringify({ confirmation: 'signed-fixture' }), { headers: { 'Content-Type': 'application/json' } }); };
  try {
    await bookingApi.transferCancellation('workflow', 'item');
    await bookingApi.transferCancellation('workflow', 'item', 'signed-fixture');
    assert.deepEqual(calls, [{ item: 'item' }, { item: 'item', confirmation: 'signed-fixture' }]);
  } finally { globalThis.fetch = original; }
});
