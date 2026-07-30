import { readFile, writeFile } from 'node:fs/promises';

const editorUrl = new URL('../js/features/receipts/editor.jsx', import.meta.url);
let source = await readFile(editorUrl, 'utf8');
let changed = false;

function replaceOnce(label, before, after) {
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`Не найден фрагмент для изменения «${label}»`);
  source = source.replace(before, after);
  changed = true;
}

replaceOnce(
  'защита от юридического лица в авиа-полях',
  `function firstReceiptValue(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '') ?? '';
}

function normalizeReceiptLeg(row = {}) {`,
  `function firstReceiptValue(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '') ?? '';
}

function isReceiptLegalEntityName(value) {
  return /^(?:ИП|ООО|АО|ПАО|ОАО|ЗАО|ОсОО|ТОО|LLC|JSC)\\b/i.test(String(value || '').trim());
}

function firstReceiptAirlineValue(...values) {
  return values.find((value) => value !== undefined && value !== null
    && String(value).trim() !== '' && !isReceiptLegalEntityName(value)) ?? '';
}

function normalizeReceiptLeg(row = {}) {`,
);

replaceOnce(
  'очистка ложного маршрута из ФИО продавца',
  `function normalizeReceiptLeg(row = {}) {
  const source = row && typeof row === 'object' ? row : {};
  return {
    ...emptyLeg(),
    ...source,`,
  `function normalizeReceiptLeg(row = {}) {
  const source = row && typeof row === 'object' ? row : {};
  const normalized = {
    ...emptyLeg(),
    ...source,`,
);

replaceOnce(
  'возврат очищенного авиа-сегмента',
  `    dir: firstReceiptValue(source.dir, source.direction, 'out'),
  };
}

const emptyRoom = () => ({`,
  `    dir: firstReceiptValue(source.dir, source.direction, 'out'),
  };
  if (isReceiptLegalEntityName(normalized.from) || isReceiptLegalEntityName(normalized.to)) {
    normalized.from = '';
    normalized.fromCode = '';
    normalized.to = '';
    normalized.toCode = '';
  }
  normalized.carrier = firstReceiptAirlineValue(normalized.carrier);
  return normalized;
}

const emptyRoom = () => ({`,
);

replaceOnce(
  'приоритет реальной авиакомпании над продавцом',
  `  draft.carrier = firstReceiptValue(value.carrier, value.issuer, value.airline, draft.legs.find((leg) => leg.carrier)?.carrier, draft.carrier);`,
  `  draft.carrier = firstReceiptAirlineValue(
    value.carrier,
    value.airline,
    draft.legs.find((leg) => leg.carrier)?.carrier,
    value.issuer,
    draft.carrier,
  );`,
);

if (changed) {
  await writeFile(editorUrl, source, 'utf8');
  console.log('Юридические лица исключены из авиа-маршрута и поля авиакомпании.');
} else {
  console.log('Защита авиа-полей от юридических лиц уже применена.');
}
