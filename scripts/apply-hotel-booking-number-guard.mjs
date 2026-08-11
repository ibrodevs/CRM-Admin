import { readFile, writeFile } from 'node:fs/promises';

const fileUrl = new URL('../js/features/receipts/editor.jsx', import.meta.url);
let source = await readFile(fileUrl, 'utf8');
let changed = false;

const replaceOnce = (from, to, label) => {
  if (source.includes(to)) return;
  if (label === 'безопасное заполнение бронирований'
    && source.includes("const fallbackSupplierOrder = type === 'Трансфер'")) return;
  if (!source.includes(from)) throw new Error(`Не найден фрагмент: ${label}`);
  source = source.replace(from, to);
  changed = true;
};

replaceOnce(
`function firstReceiptValue(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '') ?? '';
}
`,
`function firstReceiptValue(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '') ?? '';
}

function cleanHotelSupplierBooking(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const compact = raw.toLowerCase().replace(/[«»"'.,:;()]/g, '').replace(/\\s+/g, ' ').trim();
  const isLabelFragment = /^(?:рования|бронирования|номер бронирования|бронь|номер брони)$/i.test(compact);
  const isCheckInInstruction = /^(?:заселение|размещение) по фио$/i.test(compact);
  return isLabelFragment || isCheckInInstruction ? '' : raw;
}
`,
  'фильтр номера бронирования отеля',
);

replaceOnce(
`  draft.supplierOrderNo = value.supplierOrderNo || value.supplier_order_number || value.order_number
    || ((type === 'ЖД' || type === 'Гостиница' || type === 'Трансфер') ? value.ref || value.reference || '' : '');
  draft.hotelBookingNo = value.hotelBookingNo || value.hotel_booking_number || '';`,
`  const explicitSupplierOrder = firstReceiptValue(value.supplierOrderNo, value.supplier_order_number, value.order_number);
  const fallbackSupplierOrder = (type === 'ЖД' || type === 'Трансфер')
    ? firstReceiptValue(value.ref, value.reference)
    : '';
  draft.supplierOrderNo = type === 'Гостиница'
    ? cleanHotelSupplierBooking(explicitSupplierOrder)
    : firstReceiptValue(explicitSupplierOrder, fallbackSupplierOrder);
  draft.hotelBookingNo = firstReceiptValue(value.hotelBookingNo, value.hotel_booking_number);`,
  'безопасное заполнение бронирований',
);

replaceOnce(
`        {type === 'Гостиница' && source('Бронирование поставщика', 'supplierOrderNo')}
        {type === 'Гостиница' && source('Бронирование отеля', 'hotelBookingNo')}`,
`        {type === 'Гостиница' && source('Бронирование поставщика', 'supplierOrderNo', { placeholder: 'Не указано в ваучере' })}
        {type === 'Гостиница' && source('Бронирование отеля', 'hotelBookingNo', { placeholder: 'Не указано в ваучере' })}`,
  'понятные пустые состояния',
);

const required = [
  'function cleanHotelSupplierBooking(value)',
  "const fallbackSupplierOrder = type === 'Трансфер'",
  "placeholder: 'Не указано в ваучере'",
];
for (const token of required) {
  if (!source.includes(token)) throw new Error(`Исправление бронирований не подтверждено: ${token}`);
}

if (changed) await writeFile(fileUrl, source, 'utf8');
console.log(changed
  ? 'Мусорные OCR-фрагменты удалены из бронирования поставщика отеля.'
  : 'Фильтрация бронирований отеля уже настроена.');
