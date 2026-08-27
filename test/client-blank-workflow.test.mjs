import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const fulfillment = await readFile(new URL('../js/page_fulfillment.jsx', import.meta.url), 'utf8');
const editor = await readFile(new URL('../js/features/receipts/editor.jsx', import.meta.url), 'utf8');
const ui = await readFile(new URL('../js/ui.jsx', import.meta.url), 'utf8');
const flights = await readFile(new URL('../js/page_flights.jsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../app/receipt-workflow.css', import.meta.url), 'utf8');
const layout = await readFile(new URL('../app/layout.jsx', import.meta.url), 'utf8');
const catalog = await import('../js/features/receipts/tax-catalog.js');

// 1. Стоимость и корректировки применяются ко всем бланкам только по явному
//    выбору оператора и после подтверждения.
test('mass apply is an explicit operator choice, never an automatic decision', () => {
  assert.match(fulfillment, /const \[applyScope, setApplyScope\] = useState\('current'\)/);
  assert.match(fulfillment, /function ReceiptApplyScopePanel\(/);
  assert.match(fulfillment, /Куда применить стоимость и корректировки\?/);
  assert.match(fulfillment, /Только этот бланк/);
  assert.match(fulfillment, /Применять общие исправления ко всей группе/);
  assert.match(fulfillment, /Что переносим на остальные бланки/);
  // Подтверждение показывает список бланков и суммы до применения.
  assert.match(fulfillment, /Бланки, которых это коснётся/);
  assert.match(fulfillment, /Стоимость, которая станет общей/);
  // Сброс области при каждом открытии редактора.
  assert.match(fulfillment, /setApplyScope\('current'\);\n\s*setApplyParts\(RECEIPT_APPLY_ALL_PARTS\);/);
});

test('the pricing form applies to other blanks only through a confirmed scope', () => {
  assert.match(fulfillment, /const \[scopeKey, setScopeKey\] = useState\('current'\)/);
  assert.match(fulfillment, /К каким бланкам применить расчёт\?/);
  assert.match(fulfillment, /const mathScopeOptions = \(\(\) => \{/);
  assert.match(fulfillment, /Все загруженные бланки услуги/);
  assert.match(fulfillment, /Применить расчёт к \$\{targetRows\.length\} бланкам\?/);
  // Массовое применение уходит в setMathFor только явным списком.
  assert.match(fulfillment, /onSave\(patch\(\), massApply \? targetRows : null\)/);
  assert.match(fulfillment, /const setMathFor = \(id, p, patch, explicitTargets\) =>/);
  assert.doesNotMatch(fulfillment, /const targets = pricingSel\[id\]/);
});

test('order and service blanks share the same explicit group apply', () => {
  assert.match(fulfillment, /Применение стоимости и корректировок ко всем бланкам заказа/);
  assert.match(fulfillment, /Применение стоимости и корректировок ко всем бланкам услуги/);
  assert.match(fulfillment, /const receiptGroupInfo = \(\(\) => \{/);
});

// 2. Новая такса выбирается из выпадающего списка.
test('a new tax row is picked from a searchable catalog', () => {
  assert.match(editor, /aviaTaxOptionsFor\(row\.code\)/);
  assert.match(editor, /searchPlaceholder="Код или название таксы…"/);
  assert.match(editor, /autoOpen=\{openPickerRow === pickerKey\}/);
  assert.match(editor, /setFocusAmountRow\(pickerKey\)/);
  assert.match(editor, /data-amount-row=\{pickerKey\}/);
  assert.match(editor, /document\.querySelector\(`\[data-amount-row=/);
  assert.match(editor, /addLabel = isTax \? 'Добавить таксу'/);
  // Combobox умеет искать по первым буквам и листаться скроллом.
  assert.match(ui, /o\.keywords \|\| ''/);
  assert.match(ui, /String\(o\.value\)\.toLowerCase\(\)\.startsWith\(needle\)/);
  assert.match(ui, /event\.key === 'ArrowDown' \|\| event\.key === 'ArrowUp'/);
  assert.match(ui, /maxHeight: 320, overflowY: 'auto'/);
});

test('the tax catalog is complete, unique and grouped', () => {
  const { AVIA_TAX_OPTIONS, AVIA_TAX_BY_CODE, aviaTaxOptionsFor, aviaTaxName, CUSTOM_TAX_VALUE } = catalog;
  assert.ok(AVIA_TAX_OPTIONS.length >= 90, 'каталог должен покрывать основные таксы');
  const codes = AVIA_TAX_OPTIONS.map((option) => option.value);
  assert.equal(new Set(codes).size, codes.length, 'коды такс не повторяются');
  for (const code of ['YQ', 'YR', 'XT', 'RU', 'KZ', 'KG', 'GB', 'DE', 'AY', 'XF']) {
    assert.ok(AVIA_TAX_BY_CODE[code], `в каталоге должна быть такса ${code}`);
  }
  AVIA_TAX_OPTIONS.forEach((option) => {
    assert.equal(option.label, `${option.value} — ${option.name}`);
    assert.ok(option.group, `у таксы ${option.value} должна быть группа`);
    assert.ok(option.keywords.includes(option.value));
  });
  // Такса поставщика вне справочника не теряется, а ручной ввод доступен.
  const withUnknown = aviaTaxOptionsFor('ZZ9');
  assert.equal(withUnknown[0].value, 'ZZ9');
  assert.ok(withUnknown.some((option) => option.value === CUSTOM_TAX_VALUE));
  assert.equal(aviaTaxName('YQ'), 'Топливный сбор перевозчика');
  assert.equal(aviaTaxName('ZZ9', 'своя такса'), 'своя такса');
});

// 3. Печать не выбрасывает из редактора.
test('printing keeps the operator inside the receipt editor', () => {
  // Escape закрывает только верхнее окно, а не весь стек панелей.
  assert.match(ui, /const OVERLAY_LAYERS = \[\]/);
  assert.match(ui, /const top = OVERLAY_LAYERS\[OVERLAY_LAYERS\.length - 1\]/);
  assert.match(ui, /function useOverlayLayer\(open, onClose\)/);
  assert.doesNotMatch(ui, /const h = \(e\) => \{ if \(e\.key === 'Escape'\) onClose && onClose\(\); \};/);
  // На время печати закрытие по Escape и клику по подложке заблокировано.
  assert.match(ui, /function isPrintGuardActive\(\)/);
  assert.match(ui, /if \(isPrintGuardActive\(\)\) return;/);
  assert.match(ui, /printGuardUntil = Date\.now\(\) \+ ms;/);
  // Фирменный PDF выгружается без системного окна печати.
  assert.match(editor, /const downloadBrandPdf = async \(\) =>/);
  assert.match(editor, /window\.jspdf/);
  assert.match(editor, /Вернуться в редактор/);
  assert.match(editor, /вы остались в редакторе/i);
  assert.match(styles, /\.receipt-print-notice/);
});

// 4. Бланки поставщика редактируются прямо в услуге заказа.
test('supplier blanks are editable and downloadable inside the order service', () => {
  assert.match(fulfillment, /export function ServiceBlanksPanel\(/);
  assert.match(fulfillment, /Бланки поставщика по услуге/);
  assert.match(fulfillment, /Редактировать бланк/);
  assert.match(fulfillment, /Фирменный бланк/);
  assert.match(fulfillment, /Оригинал с корректировками/);
  assert.match(fulfillment, /Исходный файл/);
  assert.match(flights, /import \{ ServiceBlanksPanel \} from '\.\/page_fulfillment'/);
  assert.match(flights, /<ServiceBlanksPanel service=\{svc\}/);
  assert.match(flights, /Бланки поставщика в редакторе/);
  assert.match(styles, /\.service-blank-card/);
  assert.match(layout, /receipt-workflow\.css/);
});
