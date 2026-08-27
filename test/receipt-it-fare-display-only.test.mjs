import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const editor = await readFile(new URL('../js/features/receipts/editor.jsx', import.meta.url), 'utf8');
const adapters = await readFile(new URL('../js/api/legacy-adapters.js', import.meta.url), 'utf8');

test('IT mode is display-only and never overwrites aviation supplier amounts', () => {
  assert.match(editor, /function receiptOutputUsesItFare\(output\)/);
  assert.match(editor, /function receiptRestoreAviaAmount\(value, sourceValue, rows, sourceRows\)/);
  assert.match(editor, /const setAviaItFareMode = \(enabled\) => \{[\s\S]*?fare: p\.fare,[\s\S]*?taxes: p\.taxes,[\s\S]*?fees: p\.fees,[\s\S]*?output: nextOutput/s);
  assert.match(editor, /<Checkbox on=\{receiptUsesItFare\(p\)\}\s*onChange=\{setAviaItFareMode\}/s);
});

test('IT marker can only replace the tariff display, while taxes and fees remain monetary', () => {
  assert.match(editor, /const fareMoney = \(\) => receiptUsesItFare\(p\) \? 'IT' : money\(p\.fare\)/);
  assert.match(editor, /<span>Таксы перевозчика<\/span><b>\{money\(p\.taxes\)\}<\/b>/);
  assert.match(editor, /<span>Сервисный сбор<\/span><b>\{money\(p\.fees\)\}<\/b>/);
});

test('legacy records with accidental IT markers recover amounts from immutable supplier data', () => {
  assert.match(adapters, /const supplierFinancialSource = supplierOriginal\.verified_data/);
  assert.match(adapters, /sourceSupplierFinancials: \{[\s\S]*?fare: supplierFinancialSource\.fare,[\s\S]*?taxes: supplierFinancialSource\.taxes,[\s\S]*?fees: supplierFinancialSource\.fees/s);
  assert.match(editor, /const sourceFinancials = value\.sourceSupplierFinancials \|\| value\.source_supplier_financials \|\| \{\};/);
  assert.match(editor, /draft\.fare = receiptRestoreAviaAmount\(/);
  assert.match(editor, /draft\.taxes = receiptRestoreAviaAmount\(/);
  assert.match(editor, /draft\.fees = receiptRestoreAviaAmount\(/);
});
