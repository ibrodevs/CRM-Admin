import { readFile, writeFile } from 'node:fs/promises';

const editorUrl = new URL('../js/features/receipts/editor.jsx', import.meta.url);
let source = await readFile(editorUrl, 'utf8');

const importLine = "import { normalizeReceiptDisplayDate } from './date';";
const importAnchor = "import { segmentConnectionLabel } from './layover';";
if (!source.includes(importLine)) {
  if (!source.includes(importAnchor)) throw new Error('Не найден anchor импорта для нормализации дат квитанции.');
  source = source.replace(importAnchor, `${importAnchor}\n${importLine}`);
}

const oldPassengers = "  const passengers = asArray(value.passengers, passengerFallback).map((row) => ({ ...emptyPassenger(), ...row }));";
const normalizedPassengers = `  const passengers = asArray(value.passengers, passengerFallback).map((row) => ({\n    ...emptyPassenger(),\n    ...row,\n    dob: normalizeReceiptDisplayDate(firstReceiptValue(\n      row?.dob, row?.birthDate, row?.birth_date, row?.dateOfBirth, row?.date_of_birth,\n    )),\n  }));\n  if (!passengers[0]?.dob) {\n    const fallbackDob = normalizeReceiptDisplayDate(firstReceiptValue(\n      value.dob, value.birthDate, value.birth_date, value.dateOfBirth, value.date_of_birth,\n    ));\n    if (fallbackDob) passengers[0].dob = fallbackDob;\n  }`;

if (source.includes(oldPassengers)) {
  source = source.replace(oldPassengers, normalizedPassengers);
} else if (!source.includes('dob: normalizeReceiptDisplayDate(firstReceiptValue(')) {
  throw new Error('Не найден блок пассажиров для нормализации даты рождения.');
}

await writeFile(editorUrl, source, 'utf8');
console.log('Дата рождения пассажира нормализуется в формат ДД.ММ.ГГГГ.');
