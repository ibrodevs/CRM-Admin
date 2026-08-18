import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const editor = await readFile(new URL('../js/features/receipts/editor.jsx', import.meta.url), 'utf8');
const fulfillment = await readFile(new URL('../js/page_fulfillment.jsx', import.meta.url), 'utf8');
const orders = await readFile(new URL('../js/page_orders.jsx', import.meta.url), 'utf8');
const app = await readFile(new URL('../js/app.jsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
const adapters = await readFile(new URL('../js/api/legacy-adapters.js', import.meta.url), 'utf8');
const data = await readFile(new URL('../js/data.jsx', import.meta.url), 'utf8');

test('print and PDF export target only the selected receipt drawer', () => {
  assert.match(editor, /closest\('\.drawer-overlay'\)/);
  assert.match(editor, /classList\.add\('receipt-print-target'\)/);
  assert.match(editor, /downloadSupplierPdf/);
  assert.match(styles, /\.drawer-overlay\.receipt-print-target\{display:block!important/);
});

test('receipt sections collapse and avia taxes use a searchable catalog', () => {
  assert.match(editor, /function Section\(\{ title, action, children, defaultOpen = true \}\)/);
  assert.match(editor, /aria-expanded=\{open\}/);
  assert.match(editor, /const AVIA_TAX_OPTIONS = \[/);
  assert.match(editor, /<Combobox options=\{AVIA_TAX_OPTIONS/);
  assert.match(editor, /Выберите или найдите таксу/);
});

test('bulk calculation scope is chosen explicitly and preserves every ticket tariff', () => {
  assert.match(fulfillment, /const requestBulkApply = \(scope = 'selected'\)/);
  assert.match(fulfillment, /scope === 'all' \? bulkEligibleRows : selectedPricingRows/);
  assert.match(fulfillment, /requestBulkApply\('selected'\)/);
  assert.match(fulfillment, /requestBulkApply\('all'\)/);
  assert.match(fulfillment, /Применить ко всем проверенным/);
  assert.match(fulfillment, /Да, применить ко всем/);
  assert.match(fulfillment, /Исходный тариф каждого билета не изменится/);
  assert.match(fulfillment, /const \[pricingSel, setPricingSel\]/);
  assert.match(fulfillment, /Выбрать с такой же стоимостью/);
  assert.match(fulfillment, /clientTotal: clientTotal\(ticketMath\)/);
});

test('opening and closing a printable blank keeps every receipt editor open', () => {
  assert.match(fulfillment, /onBrand=\{\(\) => \{ setBrandId\(editId\); \}\}/);
  assert.match(fulfillment, /onBrand=\{\(\) => \{ setBrandId\(subEdit\.fileId\); \}\}/);
  assert.match(fulfillment, /onBrand=\{\(\) => \{ setReceiptBrand\(receiptEdit\); \}\}/);
  assert.match(fulfillment, /onBrand=\{\(\) => \{ setBrandEdit\(edit\); \}\}/);
  assert.doesNotMatch(fulfillment, /setBrandId\(editId\); setEditId\(null\)/);
  assert.doesNotMatch(fulfillment, /setReceiptBrand\(receiptEdit\); setReceiptEdit\(null\)/);
  assert.doesNotMatch(fulfillment, /setBrandEdit\(edit\); closeReceiptEditor\(\)/);
});

test('final import step can create a real order with the existing customer form', () => {
  assert.match(fulfillment, /modes=\{\['new', 'order', 'person'\]\}/);
  assert.match(fulfillment, /const createdOrder = await onCreateOrder\(\)/);
  assert.match(app, /<OrderCreateModal open=\{!!receiptOrderRequest\}/);
  assert.match(app, /onCreateOrder=\{requestReceiptOrder\}/);
  assert.match(orders, /ReactDOM\.createPortal\(orderCreateNode, document\.body\)/);
  assert.match(orders, /drawer-overlay order-create-overlay/);
});

test('draft action is visible and stores complete ticket calculation state', () => {
  assert.match(fulfillment, /onClick=\{\(\) => saveDraft\(false\)\}/);
  assert.match(fulfillment, /pricingSel,/);
  assert.match(fulfillment, /Сохранить изменения черновика/);
});

test('orders list has date, access counts and load-more behavior', () => {
  assert.match(orders, /Доступно по роли/);
  assert.match(orders, /Назначено вам/);
  assert.match(orders, /<th>Дата<\/th>/);
  assert.match(orders, /\{o\.date \|\| '—'\}/);
  assert.match(orders, /Загрузить ещё/);
});

test('pricing table is responsive and document names are precise', () => {
  assert.match(fulfillment, /receipt-pricing-table/);
  assert.match(styles, /\.receipt-pricing-table thead\{display:none\}/);
  assert.match(fulfillment, /doc: 'Электронный ЖД-билет'/);
  assert.match(fulfillment, /doc: 'Маршрут-квитанция'/);
  assert.match(adapters, /itinerary_receipt: 'Маршрут-квитанция'/);
  assert.match(data, /'Маршрут-квитанция':\s+\{ icon: 'route'/);
});

test('group review cannot skip an unreviewed ticket', () => {
  assert.match(fulfillment, /const furthestAccessibleIndex = firstUnreviewedIndex/);
  assert.match(fulfillment, /const canOpenBlank = \(index\) => index <= furthestAccessibleIndex/);
  assert.match(fulfillment, /disabled=\{!canOpenBlank\(index\)\}/);
  assert.match(fulfillment, /disabled=\{safeBlankIndex >= groupTickets\.length - 1 \|\| !canOpenBlank\(safeBlankIndex \+ 1\)\}/);
});
