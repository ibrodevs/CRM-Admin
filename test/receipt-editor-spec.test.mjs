import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { toLegacyDocument } from '../js/api/legacy-adapters.js';

const editor = await readFile(new URL('../js/features/receipts/editor.jsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
const page = await readFile(new URL('../js/page_fulfillment.jsx', import.meta.url), 'utf8');

test('редактор использует отдельные формы авиа, ЖД, гостиницы и трансфера', () => {
  for (const service of ['Авиа', 'ЖД', 'Гостиница', 'Трансфер']) {
    assert.match(editor, new RegExp(`type === '${service}'`));
  }
  assert.match(editor, /2\. Информация об отеле/);
  assert.match(editor, /4\. Автомобиль/);
  assert.match(editor, /Разбивка сервисных сборов/);
  assert.match(editor, /Дополнительные услуги/);
  assert.match(editor, /Разбивка тарифа/);
  assert.match(editor, /\(type === 'Авиа' \|\| type === 'ЖД'\).*label="Время прибытия"/);
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
  assert.match(editor, /Number\(value\.originalTotal\)/);
  assert.match(editor, /explicitTicketCost !== '' \? explicitTicketCost : roundMoney/);
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
  assert.match(editor, /Скачать исправленный PDF/);
  assert.match(editor, /Скачать фирменный PDF/);
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
  assert.match(editor, /fareRows\.map/);
  assert.match(editor, /taxRows\.map/);
  assert.match(editor, /feeRows\.map/);
  assert.match(editor, /leg\.fareBasis/);
  assert.match(editor, /Багаж сегмента/);
  assert.match(editor, /suppliedFareInfo\.code \|\| draft\.fareBasis/);
  assert.match(editor, /receipt-brand-segment-grid/);
  assert.match(editor, /segmentConnectionLabel/);
  assert.match(editor, /type === 'ЖД' && <><h4>Расчёт стоимости/);
  assert.match(styles, /td\[data-label="Проверка"\] \.pill/);
  assert.match(styles, /minmax\(170px,\.68fr\)/);
  assert.match(styles, /white-space:nowrap;line-height:1\.2;text-align:center;overflow-wrap:normal/);
});

test('авиа-режим IT закрывает только тариф, таксы и сборы остаются суммами', () => {
  assert.match(editor, /function receiptUsesItFare\(draft\)/);
  assert.match(editor, /\['it', 'itFare', 'fareIt'\]\.includes\(draft\?\.output\?\.priceMode\)/);
  assert.match(editor, /const fareMoney = \(\) => receiptUsesItFare\(p\) \? 'IT' : money\(p\.fare\)/);
  assert.match(editor, /const fareRowMoney = \(row\) => receiptUsesItFare\(p\) \? 'IT' : money\(row\.amount\)/);
  assert.match(editor, /<span>Таксы перевозчика<\/span><b>\{money\(p\.taxes\)\}<\/b>/);
  assert.match(editor, /<span>Сервисный сбор<\/span><b>\{money\(p\.fees\)\}<\/b>/);
  assert.match(editor, /Закрыть тариф на IT/);
  assert.match(editor, /Таксы и сборы останутся видимыми/);
});

test('паспорт не теряется при пустом массиве пассажиров, а полные данные идут до маршрута', () => {
  assert.match(page, /const receiptImportPassengers =/);
  assert.match(page, /verified\.passengers/);
  assert.match(page, /document: draft\.document_number \|\| verified\.document_number/);
  assert.match(page, /loyaltyCard: draft\.loyalty_card \|\| verified\.loyalty_card/);
  for (const label of ['ФИО', 'Дата рождения', 'Документ / паспорт', 'Номер билета', 'Код бронирования \\(PNR\\)', 'Бонусная карта']) {
    assert.match(editor, new RegExp(`\\['${label}'`));
  }
  assert.ok(editor.indexOf('receipt-brand-passengers') < editor.indexOf('<h4>Маршрут</h4>'));
  assert.match(editor, /type !== 'Авиа' && <>/);
  assert.match(styles, /\.receipt-brand-passenger-grid\{/);
});

test('отельный бланк разделяет адрес, контакты и подписанные параметры номера', () => {
  assert.match(editor, /receipt-brand-hotel-address/);
  assert.match(editor, /receipt-brand-hotel-contacts/);
  assert.match(editor, /\['Категория номера', room\.category\]/);
  assert.match(editor, /\['Взрослых', room\.adults \?\? 0\]/);
  assert.match(editor, /\['Питание', room\.meal\]/);
  assert.match(editor, /p\.rooms\.length > 1 && !!room\.guestIds\?\.length/);
  assert.match(styles, /receipt-brand-hotel-room-grid/);
});

test('закрытие изменённого редактора предупреждает и предлагает сохранить черновик', () => {
  assert.match(page, /const editDirty = useRef\(false\)/);
  assert.match(page, /setConfirmEditorClose\(true\)/);
  assert.match(page, /confirmLabel="Сохранить черновик"/);
  assert.match(page, /saveReceipt\(current\.id, current\.parsed, true\)/);
  assert.match(page, /draft: asDraft/);
  assert.match(page, /if \(!asDraft\) await onChanged\?\.\(\)/);
  assert.match(page, /Черновик квитанции сохранён/);
  assert.match(page, /onClose=\{closeReceiptEditor\}/);
});

test('диалог сохранения черновика использует стабильные контейнеры иконок', async () => {
  const ui = await readFile(new URL('../js/ui.jsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../app/receipt-ui-fixes.css', import.meta.url), 'utf8');
  assert.match(ui, /className="confirm-dialog-drawer"/);
  assert.match(styles, /\.confirm-dialog-drawer \.modal-close/);
  assert.match(styles, /\.confirm-dialog-drawer \.drawer-foot \.btn/);
  assert.match(styles, /\.receipt-import-draft-banner > \.receipt-import-draft-icon \{[\s\S]*align-self: center/);
});

test('компактное имя, ЖД-место, live preview и сворачиваемые подбланки реализованы вместе', () => {
  assert.match(editor, /export function receiptParticipantLabel/);
  assert.match(editor, /receiptParticipantSurname\(names\[0\]\).*receiptBlankWord\(blankCount - 1\)/s);
  assert.match(editor, /label="Вагон"/);
  assert.match(editor, /label="Место"/);
  assert.match(editor, /receipt-preview-rail-place/);
  assert.match(page, /receipt-edit-layout/);
  assert.match(page, /Предпросмотр обновляется сразу/);
  assert.match(page, /Квитанция с корректировками/);
  assert.match(page, /const \[previewExpanded, setPreviewExpanded\] = useState\(false\)/);
  assert.match(page, /aria-controls="receipt-corrected-preview"/);
  assert.match(page, /onClick=\{\(\) => setPreviewExpanded\(true\)\}/);
  assert.match(page, /ReactDOM\.createPortal/);
  assert.match(page, /event\.key !== 'Escape'/);
  assert.match(page, /Развернутая квитанция с корректировками/);
  assert.match(page, /width="min\(1280px,98vw\)"/);
  assert.match(page, /receipt-subrows-toggle/);
  assert.match(page, /expandedReceipts/);
  assert.match(page, /expandedRegistry/);
});

test('прогресс импорта можно сохранить черновиком и продолжить из редактора', () => {
  assert.match(page, /const hasImportProgress/);
  assert.match(page, /title="Закрыть импорт\?"/);
  assert.match(page, /Сохранить черновик и выйти/);
  assert.match(page, /Продолжить черновик/);
  assert.match(page, /Продолжить редактирование/);
  assert.match(page, /readReceiptImportDrafts/);
  assert.match(page, /writeReceiptImportDrafts/);
  assert.match(page, /upsertReceiptImportDraft/);
  assert.match(page, /removeReceiptImportDraft/);
  assert.match(page, /serializableReceiptImportFile/);
  assert.match(page, /sourceDocumentId/);
  assert.match(page, /initialDraft=\{activeImportDraft\}/);
  assert.match(page, /beforeunload/);
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

test('сохранённые исправления ЖД имеют приоритет и дочерние билеты не склеиваются', () => {
  const correctedTickets = [
    { passenger: 'ВАСЯКИН ДМИТРИЙ АЛЕКСАНДРОВИЧ', ticketNo: '72100000000001', ticketCost: '3868.10', reservedSeatCost: '0', total: '3868.10' },
    { passenger: 'ВАСЯКИН ДМИТРИЙ АЛЕКСАНДРОВИЧ', ticketNo: '72300000000002', ticketCost: '3786.70', reservedSeatCost: '0', total: '3786.70' },
  ];
  const document = toLegacyDocument({
    id: 'd1d1d1d1-1111-2222-3333-444444444444',
    kind: 'ticket',
    status: 'draft',
    title: 'ЖД туда-обратно.pdf',
    amount: '7654.80',
    currency: 'RUB',
    metadata: {
      supplier_original: {
        verified_data: { service_kind: 'rail', ticketCost: '7654.80', total: '7654.80' },
      },
      receipt_import: {
        stage: 'confirmed',
        parser_status: 'parsed',
        service_kind: 'rail',
        service_type: 'ЖД',
        verified_data: { service_kind: 'rail', receipt_items: correctedTickets, total: '7654.80' },
      },
    },
  });

  assert.equal(document.parsed.receipt_items.length, 2);
  assert.equal(document.parsed.receipt_items[0].total, '3868.10');
  assert.equal(document.parsed.receipt_items[1].total, '3786.70');
  assert.equal(document.parsed.ticketCost, undefined);
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
          fare_breakdown: [{ code: 'S7', label: 'OVB → DME', amount: '100', currency: 'NUC' }],
        },
      },
      receipt_import: { service_kind: 'avia', service_type: 'Авиа', parser_status: 'parsed' },
    },
  }, [{ id: 'd2d2d2d2-1111-2222-3333-444444444444', no: 'CRM-125' }]);
  assert.equal(document.orderId, 'd2d2d2d2-1111-2222-3333-444444444444');
  assert.equal(document.order, 'CRM-125');
  assert.equal(document.parsed.supplierOrderNo, '5994230');
  assert.equal(document.parsed.fareBreakdown[0].label, 'OVB → DME');
});

test('реестр показывает участника из верхнего поля даже при пустом массиве пассажиров', () => {
  assert.match(editor, /const fallback = String\(draft\.passenger \|\| ''\)\.trim\(\)/);
  assert.match(editor, /const resolved = names\.length \? names : \(fallback \? \[fallback\] : \[\]\)/);
  assert.match(editor, /Number\(draft\.receiptCount\) > 1/);
});

test('зона загрузки даёт явную обратную связь при перетаскивании файлов', () => {
  assert.match(page, /const \[dragActive, setDragActive\] = useState\(false\)/);
  assert.match(page, /onDragEnter=\{onDragEnter\}/);
  assert.match(page, /Отпустите файлы для загрузки/);
  assert.match(page, /receipt-drop-zone.*is-dragging/);
});

test('импорт показывает заметный прогресс загрузки и распознавания', () => {
  assert.match(page, /const importProgress = files\.length \? Math\.round/);
  assert.match(page, /role="progressbar"/);
  assert.match(page, /aria-valuenow=\{importProgress\}/);
  assert.match(page, /Загрузка и распознавание квитанций/);
  assert.match(page, /Обработано <b>\{done\.length\}<\/b> из <b>\{files\.length\}<\/b> файлов/);
  assert.match(styles, /\.receipt-upload-progress\{/);
  assert.match(styles, /\.receipt-upload-progress-track/);
});

test('групповой ЖД PDF отображает каждый билет отдельной подстрокой', () => {
  assert.match(page, /function receiptImportSubrows\(type, receipts, expectedCount = 0\)/);
  assert.match(page, /const subReceipts = receiptImportSubrows\([\s\S]*detectedType,[\s\S]*result\.receipt_items[\s\S]*declaredBlankCount/);
  assert.match(page, /function aggregateReceiptSubrows\(parent, subReceipts, receiptType = 'ЖД'\)/);
  assert.match(page, /groupTickets: tickets/);
  assert.match(page, /receiptCount: tickets\.length/);
  assert.match(page, /className="rec-import-subrow"/);
  assert.match(page, /Билет \{subIndex \+ 1\} из \{r\.f\.subReceipts\.length\}/);
  assert.match(page, /вагон \$\{railLeg\.coach\}/);
  assert.match(page, /место \$\{railLeg\.seat\}/);
  assert.match(page, /Билет: \{recMoney\(Number\(subReceipt\.ticketCost\)/);
  assert.match(page, /Плацкарта: \{recMoney\(Number\(subReceipt\.reservedSeatCost\)/);
  assert.match(page, /Такая же стоимость у \{identicalCostCount\} билетов/);
  assert.match(page, /Изменить билет/);
  assert.match(page, /updateSubReceipt\(subEdit\.fileId, subEdit\.index, parsed\)/);
  assert.match(page, /В составе общего PDF/);
  assert.match(page, /className="receipt-registry-subrow"/);
  assert.match(page, /stored\?\.groupTickets \|\| stored\?\.receiptItems \|\| stored\?\.receipt_items \|\| stored\?\.receipts \|\| stored\?\.railTickets/);
  assert.match(page, /openGroupTicketEditor\(d, ticketIndex\)/);
  assert.match(page, /Изменить бланк/);
  assert.match(styles, /\.rec-import-table tbody tr\.rec-import-subrow/);
  assert.match(styles, /\.rec-import-subrow-cost/);
  assert.match(styles, /\.receipt-registry-table tr\.receipt-registry-subrow/);
});

test('суммы реестра разнесены по строкам, а удаление имеет доступную крупную кнопку', () => {
  assert.match(page, /rec-import-money-total/);
  assert.match(page, /rec-import-money-source/);
  assert.match(page, /rec-import-money-fee/);
  assert.match(page, /receipt-breakdown-remove/);
  assert.match(page, /aria-label="Удалить строку"/);
  assert.match(editor, /aria-label="Удалить строку"/);
});

test('сумма в разбивке такс не выходит за границы карточки', () => {
  assert.match(editor, /'is-editable' : 'is-readonly'/);
  assert.match(styles, /\.receipt-inline-row\.is-readonly\{grid-template-columns:minmax\(0,\.75fr\) minmax\(0,1\.2fr\) minmax\(76px,\.8fr\)\}/);
  assert.match(styles, /\.receipt-inline-row \.input\{min-width:0;max-width:100%\}/);
});

test('разбивка тарифа и такс использует полноширинные адаптивные строки без двойной стрелки', () => {
  assert.match(editor, /receipt-grid-2 receipt-breakdown-grid receipt-top-gap/);
  assert.match(editor, /index > 0 \? 'is-following ' : ''/);
  assert.match(styles, /\.receipt-breakdown-grid\{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(styles, /\.receipt-breakdown-grid \.receipt-inline-row\{grid-template-columns:minmax\(180px,\.8fr\) minmax\(260px,1\.5fr\) minmax\(160px,\.65fr\) 40px/);
  assert.match(styles, /\.combobox-field\{background-image:none;padding-right:13px\}/);
  assert.match(styles, /\.receipt-breakdown-grid \.receipt-inline-row\.is-following \.label\{display:none\}/);
  assert.match(styles, /\.receipt-breakdown-grid \.receipt-inline-row\.is-readonly\{grid-template-columns:1fr\}/);
});
