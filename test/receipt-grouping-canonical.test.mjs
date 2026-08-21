import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);

test('partial and complete backend groups keep independent child blanks', async () => {
  const source = await readFile(pageUrl, 'utf8');

  assert.match(source, /function receiptImportSubrows\(type, receipts, expectedCount = 0\)/);
  assert.match(source, /receipts\.length < 2 && Number\(expectedCount \|\| 0\) < 2/);
  assert.match(source, /agencyServiceFee: receipt\.agencyServiceFee \?\? receipt\.agency_service_fee/);
  assert.match(source, /additionalFees: receipt\.additionalFees \?\? receipt\.additional_fees/);
  assert.match(source, /sourcePage: receipt\.sourcePage \|\| receipt\.source_page/);
  assert.match(source, /receiptCount: Math\.max\(subReceipts\.length, declaredBlankCount/);
});

test('service classification and duplicates use canonical backend ticket data', async () => {
  const source = await readFile(pageUrl, 'utf8');

  assert.match(source, /extracted\.service_kind \|\| verified\.service_kind \|\| draft\.service_kind/);
  assert.match(source, /parsed\.groupTickets \|\| parsed\.receiptItems \|\| parsed\.receipts/);
  assert.match(source, /replace\(\/\[\^0-9A-ZА-ЯЁ\]\/gi, ''\)/);
  assert.match(source, /if \(duplicate\) return 'Возможный дубль'/);
});

test('group UI never presents aviation children as railway blanks', async () => {
  const source = await readFile(pageUrl, 'utf8');

  assert.match(source, /subReceiptCount > 1 \? 'Сумма группы: ' : ''/);
  assert.match(source, /r\.f\.type === 'ЖД' \? \(\[/);
  assert.match(source, /railLeg\.flightNo \? `Рейс \$\{railLeg\.flightNo\}`/);
  assert.match(source, /editingParsed\.sourcePage \|\| editingParsed\.source_page/);
});
