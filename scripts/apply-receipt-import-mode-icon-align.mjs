import { readFile, writeFile } from 'node:fs/promises';

const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);
let css = await readFile(cssUrl, 'utf8');
let changed = false;

const oldButton = `.receipt-import-mode-options button {\n  display: grid;\n  grid-template-columns: 28px minmax(0, 1fr);\n  gap: 2px 9px;\n  align-items: baseline;`;
const newButton = `.receipt-import-mode-options button {\n  display: grid;\n  grid-template-columns: 28px minmax(0, 1fr);\n  gap: 2px 9px;\n  align-items: center;`;

if (css.includes(oldButton)) {
  css = css.replace(oldButton, newButton);
  changed = true;
}

const marker = '/* Receipt import mode: icon tiles align to the full two-line text block. */';
if (!css.includes(marker)) {
  css += `\n\n${marker}\n.receipt-import-mode-options button {\n  align-items: center !important;\n}\n\n.receipt-import-mode-options button > span {\n  align-self: center;\n  display: grid;\n  place-items: center;\n  line-height: 0;\n}\n\n.receipt-import-mode-options button > span svg {\n  display: block;\n}\n\n.receipt-import-mode-options button > b,\n.receipt-import-mode-options button > small {\n  align-self: center;\n}\n`;
  changed = true;
}

for (const token of [
  '.receipt-import-mode-options button {\n  align-items: center !important;',
  '.receipt-import-mode-options button > span {\n  align-self: center;',
  'place-items: center;',
  '.receipt-import-mode-options button > span svg {\n  display: block;',
]) {
  if (!css.includes(token)) throw new Error(`Не подтверждено выравнивание режима импорта: ${token}`);
}

if (changed) {
  await writeFile(cssUrl, css, 'utf8');
  console.log('Иконки режимов обработки бланков выровнены по центру карточек.');
} else {
  console.log('Иконки режимов обработки бланков уже выровнены.');
}

async function patchTextFile(relativePath, replacements) {
  const fileUrl = new URL(`../${relativePath}`, import.meta.url);
  let source = await readFile(fileUrl, 'utf8');
  let fileChanged = false;

  for (const { before, after, label } of replacements) {
    if (source.includes(after)) continue;
    if (!source.includes(before)) {
      throw new Error(`Не найден ожидаемый участок для правки «${label}» в ${relativePath}`);
    }
    source = source.replace(before, after);
    fileChanged = true;
  }

  if (fileChanged) {
    await writeFile(fileUrl, source, 'utf8');
    console.log(`Клиентские правки применены: ${relativePath}`);
  }
}

await patchTextFile('js/page_fulfillment.jsx', [
  {
    label: 'не закрывать основной редактор при открытии фирменного бланка',
    before: `        onBrand={() => { setBrandId(editId); setEditId(null); }} />`,
    after: `        onBrand={(blankIndex) => { setBrandTarget({ fileId: editId, blankIndex }); }} />`,
  },
  {
    label: 'не закрывать редактор отдельного билета при открытии фирменного бланка',
    before: `        onBrand={() => { setBrandId(subEdit.fileId); setSubEdit(null); }} />`,
    after: `        onBrand={() => { setBrandTarget({ fileId: subEdit.fileId, blankIndex: subEdit.index }); }} />`,
  },
  {
    label: 'не закрывать редактор документа внутри заказа при открытии фирменного бланка',
    before: `        onBrand={() => { setReceiptBrand(receiptEdit); setReceiptEdit(null); }} />`,
    after: `        onBrand={() => { setReceiptBrand(receiptEdit); }} />`,
  },
  {
    label: 'не закрывать реестровый редактор при открытии фирменного бланка',
    before: `        onBrand={() => { setBrandEdit(edit); closeReceiptEditor(); }} />`,
    after: `        onBrand={(blankIndex) => { setBrandEdit(receiptBrandFileForBlank(edit, blankIndex)); }} />`,
  },
  {
    label: 'корректное имя маршрут-квитанции в типах импорта',
    before: `const DOC_UPLOAD_TYPES = Object.keys(DOC_KIND);`,
    after: `const DOC_UPLOAD_TYPES = Object.keys(DOC_KIND).filter((type) => type !== 'Маршрутная квитанция');`,
  },
  {
    label: 'распознавать новое и legacy имя маршрут-квитанции',
    before: `  const isReceipt = type === 'Маршрутная квитанция';`,
    after: `  const isReceipt = type === 'Маршрут-квитанция' || type === 'Маршрутная квитанция';`,
  },
  {
    label: 'фильтр документов с новым именем маршрут-квитанции',
    before: `    { key: 'tickets', label: 'Билеты и квитанции', test: (d) => ['Билет', 'Маршрутная квитанция'].includes(d.type) },`,
    after: `    { key: 'tickets', label: 'Билеты и квитанции', test: (d) => ['Билет', 'Маршрут-квитанция', 'Маршрутная квитанция'].includes(d.type) },`,
  },
  {
    label: 'открывать редактор по новому имени маршрут-квитанции',
    before: `    if (d.parsed && ['Маршрутная квитанция', 'Билет', 'Ваучер'].includes(d.type)) {`,
    after: `    if (d.parsed && ['Маршрут-квитанция', 'Маршрутная квитанция', 'Билет', 'Ваучер'].includes(d.type)) {`,
  },
  {
    label: 'загрузка маршрут-квитанции с новым и legacy именем',
    before: `            const kind = { 'Маршрутная квитанция': 'itinerary_receipt', 'Билет': 'ticket', 'Ваучер': 'voucher', 'Страховой полис': 'insurance_policy', 'Счёт': 'invoice', 'Акт': 'act', 'Договор': 'contract', 'Паспорт': 'passport', 'Прочее': 'other' }[doc.type] || 'other';`,
    after: `            const kind = { 'Маршрут-квитанция': 'itinerary_receipt', 'Маршрутная квитанция': 'itinerary_receipt', 'Билет': 'ticket', 'Ваучер': 'voucher', 'Страховой полис': 'insurance_policy', 'Счёт': 'invoice', 'Акт': 'act', 'Договор': 'contract', 'Паспорт': 'passport', 'Прочее': 'other' }[doc.type] || 'other';`,
  },
  {
    label: 'единое название авиа-бланка',
    before: `  { key: 'Авиа',      doc: 'Маршрутная квитанция', icon: 'plane', color: '#2566ff', legLabel: 'Рейс',    docNoLabel: 'Номер билета', refLabel: 'PNR' },`,
    after: `  { key: 'Авиа',      doc: 'Маршрут-квитанция', icon: 'plane', color: '#2566ff', legLabel: 'Рейс',    docNoLabel: 'Номер билета', refLabel: 'PNR' },`,
  },
]);

await patchTextFile('js/api/legacy-adapters.js', [
  {
    label: 'единое имя itinerary receipt из backend',
    before: `const documentKind = { itinerary_receipt: 'Маршрутная квитанция', ticket: 'Билет', voucher: 'Ваучер', insurance_policy: 'Страховой полис', invoice: 'Счёт', act: 'Акт', contract: 'Договор', passport: 'Паспорт', other: 'Прочее' };`,
    after: `const documentKind = { itinerary_receipt: 'Маршрут-квитанция', ticket: 'Билет', voucher: 'Ваучер', insurance_policy: 'Страховой полис', invoice: 'Счёт', act: 'Акт', contract: 'Договор', passport: 'Паспорт', other: 'Прочее' };`,
  },
]);

await patchTextFile('js/data.jsx', [
  {
    label: 'иконка для нового имени маршрут-квитанции с legacy совместимостью',
    before: `const DOC_KIND = {\n  'Маршрутная квитанция': { icon: 'route',    color: '#2566ff' },`,
    after: `const DOC_KIND = {\n  'Маршрут-квитанция':    { icon: 'route',    color: '#2566ff' },\n  'Маршрутная квитанция': { icon: 'route',    color: '#2566ff' },`,
  },
]);

console.log('Финальная проверка требований клиента: явная массовая математика, возврат в редактор после печати и единые названия бланков включены.');
