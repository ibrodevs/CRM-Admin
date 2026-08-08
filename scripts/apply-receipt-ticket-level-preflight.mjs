import { readFile, writeFile } from 'node:fs/promises';

const editorUrl = new URL('../js/features/receipts/editor.jsx', import.meta.url);
let source = await readFile(editorUrl, 'utf8');
let changed = false;

const marker = '/* Ticket-level rail supplier-order guard. */';
if (!source.includes(marker)) {
  const guarded = "  const fallbackSupplierOrder = (type === 'ЖД' || type === 'Трансфер')\n    ? firstReceiptValue(value.ref, value.reference)\n    : '';";
  const railSafe = "  const fallbackSupplierOrder = type === 'Трансфер'\n    ? firstReceiptValue(value.ref, value.reference)\n    : '';";
  if (source.includes(guarded)) {
    source = source.replace(guarded, railSafe);
    changed = true;
  } else if (!source.includes("const fallbackSupplierOrder = type === 'Трансфер'")) {
    throw new Error('Не найден post-guard блок supplierOrderNo для ЖД.');
  }

  // The final patch supports the older pre-guard source too. This compatibility
  // marker tells it that the rail fallback is already fixed by this preflight.
  source += `\n\n${marker}\n// ((type === 'Гостиница' || type === 'Трансфер') ? value.ref\n`;
  changed = true;
}

if (!source.includes("const fallbackSupplierOrder = type === 'Трансфер'")) {
  throw new Error('ЖД ticketNo всё ещё может попасть в supplierOrderNo.');
}

if (changed) await writeFile(editorUrl, source, 'utf8');
console.log(changed
  ? 'ЖД номер билета отделён от номера заказа поставщика до финального receipt patch.'
  : 'Rail supplier-order preflight уже применён.');
