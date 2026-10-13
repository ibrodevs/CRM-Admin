import assert from 'node:assert/strict';
import test from 'node:test';
import { waitForFlightProviderJob } from '../src/modules/services/flights/provider-operations.js';

test('provider operation waits for completion and uses persisted service status', async () => {
  const states = ['queued', 'running', 'succeeded'];
  let reads = 0;
  const result = await waitForFlightProviderJob('job', 'service', { readJob: async () => ({ status: states.shift() }),
    readService: async () => { reads += 1; return { status: 'cancelled' }; }, delay: async () => {} });
  assert.equal(reads, 1);
  assert.equal(result.service.status, 'cancelled');
});

test('failed provider job cannot become a success in the UI', async () => {
  await assert.rejects(waitForFlightProviderJob('job', 'service', { readJob: async () => ({ status: 'failed', error_message: 'Provider refused cancellation' }),
    readService: async () => assert.fail('must not display success'), delay: async () => {} }), /Provider refused/);
});

test('unfinished provider operation reports pending without inventing a service status', async () => {
  await assert.rejects(waitForFlightProviderJob('job', 'service', { attempts: 2, readJob: async () => ({ status: 'running' }),
    readService: async () => assert.fail('must not display success'), delay: async () => {} }), /обрабатывает/);
});

test('several tickets for one passenger are retained and PNR is never used as a ticket number', async () => {
  const { flightTicketNumbers } = await import('../src/modules/services/flights/provider-operations.js');
  const service = { external_id: 'TEST01', tickets: [{ passenger: 'p1', ticket_number: '1234567890' }, { passenger: 'p1', ticket_number: '1234567891' }, { passenger: 'p2', ticket_number: '2222222222' }] };
  assert.deepEqual(flightTicketNumbers(service, { id: 'p1' }), ['1234567890', '1234567891']);
  assert.deepEqual(flightTicketNumbers({ external_id: 'TEST01' }, { id: 'p1' }), []);
});
