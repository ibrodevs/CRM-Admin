import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const offers = await readFile(new URL('../js/page_offers.jsx', import.meta.url), 'utf8');
const receipts = await readFile(new URL('../js/page_fulfillment.jsx', import.meta.url), 'utf8');
const suppliers = await readFile(new URL('../js/page_suppliers.jsx', import.meta.url), 'utf8');
const app = await readFile(new URL('../js/app.jsx', import.meta.url), 'utf8');

test('свободное КП открывается в редакторе и сохраняется через backend', () => {
  assert.match(offers, /function StandaloneKPEditor/);
  assert.match(offers, /proposalsApi\.replaceDraft\(draft\.serverId/);
  assert.match(offers, /if \(mode === 'draft' && !np\.order\) setEditTarget\(np\)/);
  assert.match(offers, /title="Связать КП с заказом"/);
});

test('реестр КП не преобразует повторно уже нормализованные backend-записи', () => {
  assert.match(offers, /item\?\.serverId \? item : toLegacyProposal\(item, orders\)/);
  assert.match(offers, /proposalsApi\.detail\(p\.serverId\)/);
});

test('импорт принимает несколько квитанций и обновляет общую рабочую область', () => {
  assert.match(receipts, /type="file" multiple/);
  assert.match(receipts, /Promise\.all\(toAdd\.map/);
  assert.match(receipts, /await onChanged\?\.\(\)/);
  assert.match(app, /<ReceiptEditorPage[^>]+onChanged=\{\(\) => workspace\.reload\(\)\}/);
});

test('импорт ЖД не затирает распознанную стоимость нулём из пустого draft', () => {
  assert.match(receipts, /const receiptImportMoney = \(\.\.\.values\)/);
  assert.match(receipts, /draft\.total, verified\.total, verified\.originalTotal, extracted\.total/);
  assert.match(receipts, /draft\.ticketCost, draft\.ticket_cost, verified\.ticketCost/);
  assert.match(receipts, /extracted\.reservedSeatCost, extracted\.reserved_seat_cost/);
  assert.match(receipts, /priceSource: total > 0 \? 'document' : 'manual'/);
});

test('поставщик создаётся один раз, а приоритеты сохраняются профильным API', () => {
  assert.doesNotMatch(app, /const addSupplier[\s\S]{0,300}workspace\.createSupplier/);
  assert.match(suppliers, /suppliersApi\.saveSearchPriority/);
  assert.match(suppliers, /suppliersApi\.checkConnection\(created\.id\)/);
  assert.doesNotMatch(suppliers, /Синхронизировать сейчас/);
});
