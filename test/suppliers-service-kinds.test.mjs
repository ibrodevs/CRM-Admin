import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { SERVICE_KIND } from '../src/shared/constants/service-kind.js';
import { toUiSupplier } from '../src/modules/suppliers/model/suppliers.mapper.js';

test('SERVICE_KIND maps aeroexpress and lounge to Russian', () => {
  assert.equal(SERVICE_KIND.aeroexpress, 'Аэроэкспресс');
  assert.equal(SERVICE_KIND.lounge, 'Бизнес-зал');
  assert.equal(SERVICE_KIND.avia, 'Авиа');
  assert.equal(SERVICE_KIND.rail, 'ЖД');
});

test('toUiSupplier maps aeroexpress and lounge service_kinds to Russian', () => {
  const aeroSupplier = toUiSupplier({
    id: 'sup-1',
    name: 'Aeroexpress Express',
    service_kinds: ['aeroexpress'],
    status: 'active',
  });
  assert.equal(aeroSupplier.service, 'Аэроэкспресс');

  const loungeSupplier = toUiSupplier({
    id: 'sup-2',
    name: 'Airport Lounge KG',
    service_kinds: ['lounge'],
    status: 'active',
  });
  assert.equal(loungeSupplier.service, 'Бизнес-зал');
});

test('SuppliersPage defines Russian labels, synonyms and kindMap for aeroexpress and lounge', async () => {
  const source = await readFile(new URL('../src/modules/suppliers/ui/SuppliersPage.jsx', import.meta.url), 'utf8');

  // SUP_SERVICE_KINDS includes Russian terms
  assert.match(source, /const SUP_SERVICE_KINDS = \[[\s\S]*?'Аэроэкспресс'[\s\S]*?'Бизнес-залы'[\s\S]*?\];/);

  // SUP_KIND_LABEL translates aeroexpress and lounge codes
  assert.match(source, /aeroexpress:\s*'Аэроэкспресс'/);
  assert.match(source, /lounge:\s*'Бизнес-залы'/);

  // SUP_KIND_SYNONYM normalizes singular and synonyms to standard Russian plural
  assert.match(source, /'Бизнес-зал':\s*'Бизнес-залы'/);
  assert.match(source, /'Лаундж':\s*'Бизнес-залы'/);

  // kindMap maps Russian terms back to backend API codes
  assert.match(source, /'Аэроэкспресс':\s*'aeroexpress'/);
  assert.match(source, /'Бизнес-залы':\s*'lounge'/);
  assert.match(source, /'Бизнес-зал':\s*'lounge'/);
});
