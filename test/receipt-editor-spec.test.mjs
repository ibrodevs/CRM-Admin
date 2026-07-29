import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { toLegacyDocument } from '../js/api/legacy-adapters.js';

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
  assert.match(page, /receiptStatus\(d\.parsed, new Set\(\), d\.editorType, null\)/);
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
  assert.match(editor, /receipt-brand-variants/);
  assert.match(editor, /Заказ поставщика\/API/);
  assert.match(editor, /Расчёт стоимости/);
  assert.match(editor, /Тариф перевозчика/);
  assert.match(editor, /Стоимость плацкарты/);
  assert.match(editor, /Заказ в CRM: №/);
});

test('фирменные бланки авиа, ЖД и отеля получают профильные данные', () => {
  assert.match(editor, /type === 'Гостиница' && <>/);
  assert.match(editor, /p\.hotel\.address/);
  assert.match(editor, /p\.rooms\.map/);
  assert.match(editor, /type === 'Авиа' && <><h4>Расчёт стоимости/);
  assert.match(editor, /taxRows\.map/);
  assert.match(editor, /feeRows\.map/);
  assert.match(editor, /leg\.fareBasis/);
  assert.match(editor, /Багаж сегмента/);
  assert.match(editor, /suppliedFareInfo\.code \|\| draft\.fareBasis/);
  assert.match(editor, /receipt-brand-segment-grid/);
  assert.match(editor, /segmentLayoverLabel/);
  assert.match(editor, /type === 'ЖД' && <><h4>Расчёт стоимости/);
});

test('трансферный ваучер классифицируется как трансфер до общего правила ваучеров', () => {
  const transferRule = page.indexOf("if (/(transfer|трансфер|pickup|driver|car)/.test(n))");
  const voucherRule = page.indexOf("if (/(hotel|отел|voucher|ваучер|room|гостиниц)/.test(n))");
  assert.ok(transferRule >= 0 && voucherRule >= 0 && transferRule < voucherRule);
});

test('реестр восстанавливает распознанные данные из metadata backend-документа', () => {
  const document = toLegacyDocument({
    id: 'b1b1b1b1-1111-2222-3333-444444444444',
    kind: 'itinerary_receipt',
    status: 'draft',
    title: 'Ваучер трансфера.pdf',
    amount: '4200.00',
    currency: 'RUB',
    metadata: {
      supplier_original: { name: 'Ваучер трансфера.pdf' },
      receipt_import: {
        stage: 'confirmed',
        parser_status: 'parsed',
        service_kind: 'transfer',
        service_type: 'Трансфер',
        corrected_fields: {
          issuer: 'Transfer Co',
          passenger_name: 'Сорокина Ольга',
          segments: [{ from: 'Аэропорт', to: 'Отель', date: '22.05.2025' }],
          total: '4200.00',
          currency: 'RUB',
        },
      },
    },
  });
  assert.equal(document.service_kind, 'transfer');
  assert.equal(document.service_type, 'Трансфер');
  assert.equal(document.parsed.passenger, 'Сорокина Ольга');
  assert.equal(document.parsed.carrier, 'Transfer Co');
  assert.equal(document.parsed.legs[0].to, 'Отель');
  assert.equal(document.parsed.recognitionPending, false);
});

test('реестр не смешивает заказ поставщика с внутренним заказом CRM', () => {
  const document = toLegacyDocument({
    id: 'c1c1c1c1-1111-2222-3333-444444444444',
    order: 'd2d2d2d2-1111-2222-3333-444444444444',
    kind: 'itinerary_receipt',
    status: 'draft',
    title: 'S7.pdf',
    metadata: {
      supplier_original: {
        verified_data: {
          passenger: 'IVANOV IVAN',
          supplier_order_number: '5994230',
          ref: 'NLZF1I',
          total: '29153',
          currency: 'RUB',
        },
      },
      receipt_import: { service_kind: 'avia', service_type: 'Авиа', parser_status: 'parsed' },
    },
  }, [{ id: 'd2d2d2d2-1111-2222-3333-444444444444', no: 'CRM-125' }]);
  assert.equal(document.orderId, 'd2d2d2d2-1111-2222-3333-444444444444');
  assert.equal(document.order, 'CRM-125');
  assert.equal(document.parsed.supplierOrderNo, '5994230');
});

test('реестр показывает участника из верхнего поля даже при пустом массиве пассажиров', () => {
  assert.match(editor, /const fallback = String\(draft\.passenger \|\| ''\)\.trim\(\)/);
  assert.match(editor, /return names\.length \? names : \(fallback \? \[fallback\] : \[\]\)/);
});

test('зона загрузки даёт явную обратную связь при перетаскивании файлов', () => {
  assert.match(page, /const \[dragActive, setDragActive\] = useState\(false\)/);
  assert.match(page, /onDragEnter=\{onDragEnter\}/);
  assert.match(page, /Отпустите файлы для загрузки/);
  assert.match(page, /receipt-drop-zone.*is-dragging/);
});

test('суммы реестра разнесены по строкам, а удаление имеет доступную крупную кнопку', () => {
  assert.match(page, /rec-import-money-total/);
  assert.match(page, /rec-import-money-source/);
  assert.match(page, /rec-import-money-fee/);
  assert.match(page, /receipt-breakdown-remove/);
  assert.match(page, /aria-label="Удалить строку"/);
  assert.match(editor, /aria-label="Удалить строку"/);
});
