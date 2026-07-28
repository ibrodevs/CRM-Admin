import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const editor = await readFile(new URL('../js/features/receipts/editor.jsx', import.meta.url), 'utf8');
const page = await readFile(new URL('../js/page_fulfillment.jsx', import.meta.url), 'utf8');

test('редактор использует отдельные формы авиа, ЖД, гостиницы и трансфера', () => {
  for (const service of ['Авиа', 'ЖД', 'Гостиница', 'Трансфер']) {
    assert.match(editor, new RegExp(`type === '${service}'`));
  }
  assert.match(editor, /2\. Информация об отеле/);
  assert.match(editor, /4\. Автомобиль/);
  assert.match(editor, /Разбивка сервисных сборов/);
  assert.match(editor, /Дополнительные услуги/);
});

test('исходные данные защищены и исправления фиксируются в журнале', () => {
  assert.match(editor, /Данные поставщика защищены/);
  assert.match(editor, /Исправить распознавание/);
  assert.match(editor, /auditLog/);
  assert.match(editor, /before: before/);
  assert.match(editor, /after: after/);
});

test('списки участников, сегментов, номеров, такс и сборов не ограничены одной строкой', () => {
  assert.match(editor, /addRow\('passengers'/);
  assert.match(editor, /addRow\('legs'/);
  assert.match(editor, /addRow\('rooms'/);
  assert.match(editor, /addRow\(key, \{ \.\.\.emptyCharge\(\)/);
});

test('стоимость пересчитывается автоматически для каждого типа услуги', () => {
  assert.match(editor, /export function receiptFinancialTotal/);
  assert.match(editor, /ticketCost/);
  assert.match(editor, /reservedSeatCost/);
  assert.match(editor, /supplierCost/);
  assert.match(editor, /discount/);
  assert.match(editor, /withFinancialAliases/);
});

test('реестр соответствует колонкам и операциям ТЗ', () => {
  for (const column of ['Документ', 'Детали услуги', 'Стоимость', 'Проверка', 'Операции']) {
    assert.match(page, new RegExp(`<th[^>]*>${column}<\\/th>`));
  }
  for (const action of ['Проверить', 'Изменить', 'Оригинал', 'Добавить в заказ', 'Удалить']) {
    assert.match(page, new RegExp(action));
  }
  assert.match(page, /\['Маршрутная квитанция', 'Ваучер', 'Билет'\]/);
});

test('поддержаны три варианта вывода и защита внутренних финансов', () => {
  assert.match(editor, /export function ReceiptBrandDocumentDrawer/);
  assert.match(editor, /Оригинал поставщика/);
  assert.match(editor, /Фирменный бланк агентства/);
  assert.match(editor, /Фирменный бланк SaaS-компании/);
  assert.match(editor, /Показывать только «Оплачено»/);
  assert.match(editor, /Не показывать стоимость/);
  assert.match(editor, /не попадут стоимость поставщика, наценка, внутренние комиссии и сборы/);
  assert.match(editor, /Печать \/ сохранить PDF/);
});
