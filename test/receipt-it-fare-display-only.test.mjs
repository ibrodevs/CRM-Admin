import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const editor = await readFile(new URL('../js/features/receipts/editor.jsx', import.meta.url), 'utf8');
const adapters = await readFile(new URL('../js/api/legacy-adapters.js', import.meta.url), 'utf8');
const fulfillment = await readFile(new URL('../js/page_fulfillment.jsx', import.meta.url), 'utf8');

test('IT mode is display-only and never overwrites aviation supplier amounts', () => {
  assert.match(editor, /function receiptOutputUsesItFare\(output\)/);
  assert.match(editor, /function receiptRestoreAviaAmount\(value, sourceValue, rows, sourceRows\)/);
  assert.match(editor, /const setAviaItFareMode = \(enabled\) => \{[\s\S]*?fare: p\.fare,[\s\S]*?taxes: p\.taxes,[\s\S]*?fees: p\.fees,[\s\S]*?output: nextOutput/s);
  assert.match(editor, /<Checkbox on=\{receiptUsesItFare\(p\)\}\s*onChange=\{setAviaItFareMode\}/s);
});

test('IT marker replaces the tariff and the total, while taxes and fees remain monetary', () => {
  assert.match(editor, /const fareMoney = \(\) => receiptUsesItFare\(p\) \? 'IT' : money\(p\.fare\)/);
  assert.match(editor, /<span>Таксы перевозчика<\/span><b>\{money\(p\.taxes\)\}<\/b>/);
  assert.match(editor, /<span>Сервисный сбор<\/span><b>\{money\(p\.fees\)\}<\/b>/);
  // Итог содержит закрытый тариф, поэтому в документе он тоже не раскрывается.
  assert.match(editor, /const totalMoney = \(\) => itFare \? 'IT' : money\(receiptFinancialTotal\('Авиа', p\)\)/);
  assert.match(editor, /<span>Итого для клиента<\/span><b>\{totalMoney\(\)\}<\/b>/);
  assert.match(editor, /const itFareClosed = type === 'Авиа' && receiptUsesItFare\(p\)/);
  assert.match(editor, /const price = itFareClosed \? 'IT'/);
  assert.match(editor, /Тариф закрыт на IT/);
});

test('the editor itself shows the IT marker instead of the closed tariff', () => {
  assert.match(editor, /const itFareOn = type === 'Авиа' && receiptUsesItFare\(p\)/);
  assert.match(editor, /if \(itFareOn && key === 'fare'\) \{/);
  assert.match(editor, /<Input value="IT" readOnly className="input receipt-it-input"/);
  // Закупочная сумма никуда не девается — она в подсказке под полем.
  assert.match(editor, /Закупка \$\{roundMoney\(itFareAmount\)/);
  // Маркер стоит только в графе тарифа: итоги в редакторе остаются суммами,
  // иначе оператор теряет рабочие числа.
  assert.match(editor, /<Input value=\{total\} readOnly className="input receipt-total-input" \/>/);
  assert.match(editor, /В клиентском документе итог закрыт на IT/);
  assert.doesNotMatch(editor, /value=\{itFareOn \? 'IT' : total\}/);
  assert.doesNotMatch(editor, /kind === 'fare' && itFareOn/);
});

test('a literal IT printed by the supplier never stays in a numeric field', () => {
  // Разбор маркера идёт всегда, а не только при уже включённом режиме IT.
  assert.match(editor, /  if \(type === 'Авиа'\) \{\n    const sourceFinancials = value\.sourceSupplierFinancials/);
  assert.match(editor, /const supplierClosedFare = receiptIsItMarker\(draft\.fare\)/);
  assert.match(editor, /draft\.fareBreakdown = \(draft\.fareBreakdown \|\| \[\]\)\.map\(\(row\) => \(receiptIsItMarker\(row\?\.amount\)/);
  assert.match(editor, /draft\.taxBreakdown = \(draft\.taxBreakdown \|\| \[\]\)\.map\(\(row\) => \(receiptIsItMarker\(row\?\.amount\)/);
  // Закрытый поставщиком тариф сам включает режим IT.
  assert.match(editor, /if \(supplierClosedFare && !receiptOutputUsesItFare\(draft\.output\)\) \{/);
  assert.match(editor, /priceMode: 'it', itFareSource: 'supplier'/);
});

test('group apply shares IT display settings without copying another blank snapshot', () => {
  assert.match(fulfillment, /const \{ itFareSnapshot, it_fare_snapshot: legacySnapshot, \.\.\.displayOutput \} = parsed\.output;/);
  assert.match(fulfillment, /Object\.assign\(shared, \{ output: displayOutput \}\)/);
});

test('an IT marker resolves to a real amount when one is recoverable, and to empty when not', () => {
  const names = ['receiptIsItMarker', 'receiptNumericSource', 'receiptBreakdownTotal', 'receiptRestoreAviaAmount'];
  const sources = names.map((name) => {
    const from = editor.indexOf(`function ${name}(`);
    const to = editor.indexOf('\n}', from);
    assert.ok(from >= 0 && to > from, `helper ${name} must exist`);
    return editor.slice(from, to + 2);
  });
  const roundMoney = editor.slice(editor.indexOf('function roundMoney('), editor.indexOf('\n}', editor.indexOf('function roundMoney(')) + 2);
  const { receiptRestoreAviaAmount } = Function(
    `${roundMoney}\n${sources.join('\n')}\nreturn { receiptRestoreAviaAmount };`,
  )();

  // Снимок закупочной суммы важнее всего.
  assert.equal(receiptRestoreAviaAmount('IT', 27428, [], []), 27428);
  // Затем — сумма собственной разбивки бланка.
  assert.equal(receiptRestoreAviaAmount('IT', '', [{ amount: '5 261,50' }, { amount: 700 }], []), 5961.5);
  // Затем — неизменяемые данные поставщика.
  assert.equal(receiptRestoreAviaAmount('IT', '', [], [{ amount: 1200 }]), 1200);
  // Восстанавливать нечего — в числовой графе остаётся пусто, а не строка «IT».
  assert.equal(receiptRestoreAviaAmount('IT', '', [], []), '');
  assert.equal(receiptRestoreAviaAmount('it', '', [{ amount: 'IT' }], []), '');
  // Обычные суммы не трогаем.
  assert.equal(receiptRestoreAviaAmount(4154.1, 999, [], []), 4154.1);
  assert.equal(receiptRestoreAviaAmount('', 999, [], []), '');
});

test('legacy records with accidental IT markers recover amounts from immutable supplier data', () => {
  assert.match(adapters, /const supplierFinancialSource = supplierOriginal\.verified_data/);
  assert.match(adapters, /sourceSupplierFinancials: \{[\s\S]*?fare: supplierFinancialSource\.fare,[\s\S]*?taxes: supplierFinancialSource\.taxes,[\s\S]*?fees: supplierFinancialSource\.fees/s);
  assert.match(editor, /const sourceFinancials = value\.sourceSupplierFinancials \|\| value\.source_supplier_financials \|\| \{\};/);
  assert.match(editor, /draft\.fare = receiptRestoreAviaAmount\(/);
  assert.match(editor, /draft\.taxes = receiptRestoreAviaAmount\(/);
  assert.match(editor, /draft\.fees = receiptRestoreAviaAmount\(/);
});
