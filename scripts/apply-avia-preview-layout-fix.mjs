import { readFile, writeFile } from 'node:fs/promises';

const editorUrl = new URL('../js/features/receipts/editor.jsx', import.meta.url);
let source = await readFile(editorUrl, 'utf8');
const before = "  if (type === 'Авиа') return <div className=\"receipt-preview receipt-preview-full\"><ReceiptAviaDocument draft={draft} /></div>;";
const after = "  if (type === 'Авиа') return <ReceiptAviaDocument draft={draft} />;";

if (source.includes(after)) {
  console.log('Авиа-предпросмотр уже полностью совпадает с бланком агентства.');
} else {
  if (!source.includes(before)) throw new Error('Не найден авиа-предпросмотр для выравнивания шаблона');
  source = source.replace(before, after);
  await writeFile(editorUrl, source, 'utf8');
  console.log('Убрана лишняя обёртка: авиа-предпросмотр полностью совпадает с бланком агентства.');
}
