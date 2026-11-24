import test from 'node:test';
import assert from 'node:assert/strict';
import { proposalContext, readableServiceTitle } from '../src/modules/proposals/model/presentation.js';

test('flight cities remain readable while keeping airport and flight codes', () => {
  assert.equal(readableServiceTitle('FRU → IST · TK 347'), 'Бишкек (FRU) → Стамбул (IST) · TK 347');
  assert.equal(readableServiceTitle('Неизвестный отель'), 'Неизвестный отель');
});
test('proposal context distinguishes trip dates from expiry and labels missing data', () => {
  assert.equal(proposalContext({ travel_start: '2026-12-10', travel_end: '2026-12-14', valid_until: '2026-11-30' }).dates, '10.12.2026 — 14.12.2026');
  assert.equal(proposalContext().dates, 'Даты поездки не указаны');
  assert.equal(proposalContext({ recipient: 'Компания' }).recipient, 'Компания');
});

test('separate route inputs preserve the other endpoint and older saved routes', async () => {
  const { splitProposalRoute, setProposalRoutePoint } = await import('../src/modules/proposals/model/presentation.js');
  assert.deepEqual(splitProposalRoute('Москва → Стамбул'), { from: 'Москва', to: 'Стамбул' });
  assert.equal(setProposalRoutePoint('Москва → Стамбул', 'from', 'Бишкек'), 'Бишкек → Стамбул');
  assert.equal(setProposalRoutePoint('', 'to', 'Москва'), ' → Москва');
  assert.deepEqual(splitProposalRoute(' → Москва'), { from: '', to: 'Москва' });
  assert.equal(setProposalRoutePoint(' → Москва', 'to', ''), '');
});

test('route editing retains spaces in multiword city names', async () => {
  const { splitProposalRoute, setProposalRoutePoint } = await import('../src/modules/proposals/model/presentation.js');
  assert.equal(splitProposalRoute(setProposalRoutePoint('Москва → Стамбул', 'from', 'Нижний ')).from, 'Нижний ');
});
