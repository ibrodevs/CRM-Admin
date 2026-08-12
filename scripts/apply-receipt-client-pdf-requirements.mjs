import { readFile, writeFile } from 'node:fs/promises';

const resourcesUrl = new URL('../js/api/resources.js', import.meta.url);
const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const editorUrl = new URL('../js/features/receipts/editor.jsx', import.meta.url);
const cssUrl = new URL('../app/receipt-ui-fixes.css', import.meta.url);

let resources = await readFile(resourcesUrl, 'utf8');
let page = await readFile(pageUrl, 'utf8');
let editor = await readFile(editorUrl, 'utf8');
let css = await readFile(cssUrl, 'utf8');
let changed = false;

function replaceRequired(source, from, to, label) {
  if (source.includes(to)) return source;
  if (typeof from === 'string') {
    if (!source.includes(from)) throw new Error(`Не найден фрагмент: ${label}`);
    changed = true;
    return source.replace(from, to);
  }
  if (!from.test(source)) throw new Error(`Не найден фрагмент: ${label}`);
  changed = true;
  return source.replace(from, to);
}

// The supplier original must always point to immutable version 1.  After a
// receipt is confirmed the document receives generated/corrected versions, so
// using the generic latest-version download URL can no longer mean “original”.
const previewApi = "  previewUrl: (id) => apiPath(`documents/${id}/download/?disposition=inline`),";
const originalApi = `${previewApi}\n  originalPreviewUrl: (id) => apiPath(\`documents/\${id}/download/?file_version=1&disposition=inline\`),`;
resources = replaceRequired(resources, previewApi, originalApi, 'URL неизменяемого оригинала поставщика');

const latestPreview = `            originalUrl: (result.source_document_id || imported.document_id)\n              ? documentsApi.previewUrl(result.source_document_id || imported.document_id)\n              : item.originalUrl,`;
const v1Preview = `            originalUrl: (result.source_document_id || imported.document_id)\n              ? documentsApi.originalPreviewUrl(result.source_document_id || imported.document_id)\n              : item.originalUrl,`;
page = replaceRequired(page, latestPreview, v1Preview, 'оригинал v1 после импорта');

// Aggregated rail money is a group summary only; make that explicit so it can
// never look like the subtotal of the currently selected ticket.
const groupTotalOld = `<strong>{total.toLocaleString('ru-RU')} {draft.currency || 'RUB'}</strong>`;
const groupTotalNew = `<strong className="receipt-blank-strip-total"><small>Итого по {tickets.length} бланкам</small><b>{total.toLocaleString('ru-RU')} {draft.currency || 'RUB'}</b></strong>`;
editor = replaceRequired(editor, groupTotalOld, groupTotalNew, 'подпись общей суммы группы ЖД');

// Original mode is a real supplier PDF (version 1), not a corrected React
// reconstruction.  Agency/SaaS modes continue to show the corrected data.
const oldConditional = `      {type === 'ЖД' || (type === 'Авиа' && output.mode === 'original') ? (\n        <div className="receipt-rail-corrected-original">\n          {output.mode === 'original' && <div className="receipt-source-notice"><Icon name="checkCircle" /><div><b>{type === 'ЖД' ? 'ЖД-бланк' : 'Авиа-бланк'} с сохранёнными корректировками</b>\n            <span>{type === 'ЖД'\n              ? 'Изменения стоимости и данных выводятся отдельно на каждом билете. Исходный PDF доступен для сверки.'\n              : 'Сохранённые изменения рейсов, тарифа, такс и сборов отображаются на итоговом бланке. Исходный PDF доступен для сверки.'}</span></div></div>}\n          <ReceiptDocumentPreview type={type} draft={p} />\n        </div>\n      ) : output.mode === 'original' ? (\n        <div className="receipt-source-notice"><Icon name="lock" /><div><b>Будет использован оригинал поставщика</b>\n          <span>Исходный файл хранится и отправляется без изменений.</span></div></div>\n      ) : type === 'Авиа' ? (`;
const newConditional = `      {output.mode === 'original' ? (\n        <section className="receipt-supplier-original" aria-label="Оригинал поставщика">\n          <div className="receipt-source-notice"><Icon name="lock" /><div><b>Оригинал поставщика · без корректировок</b>\n            <span>Показывается исходный PDF версии 1. Изменения из редактора применяются только к бланку агентства и не изменяют этот файл.</span></div></div>\n          {sourcePdfUrl\n            ? <iframe className="receipt-supplier-original-frame" src={sourcePdfUrl} title="Оригинал поставщика" />\n            : <div className="receipt-empty">Исходный PDF недоступен для предпросмотра</div>}\n        </section>\n      ) : type === 'Авиа' ? (`;
editor = replaceRequired(editor, oldConditional, newConditional, 'настоящий оригинал поставщика');

const footerOriginalOld = `{sourcePdfUrl && <Button variant="secondary" icon="eye" onClick={() => window.open(sourcePdfUrl, '_blank', 'noopener,noreferrer')}>{type === 'ЖД' || type === 'Авиа' ? 'Исходный PDF' : 'Оригинал поставщика'}</Button>}`;
const footerOriginalNew = `{sourcePdfUrl && <Button variant="secondary" icon="eye" onClick={() => window.open(sourcePdfUrl, '_blank', 'noopener,noreferrer')}>Открыть оригинал в новой вкладке</Button>}`;
editor = replaceRequired(editor, footerOriginalOld, footerOriginalNew, 'открытие оригинала в новой вкладке');

// With a long airline calculation the sticky preview previously ended behind
// the Drawer footer.  Give the preview its own bounded vertical scroll and
// explicit bottom room.  Mobile keeps one natural document scroll.
const cssMarker = '/* Client receipt PDF requirements: complete preview scroll and immutable original. */';
if (!css.includes(cssMarker)) {
  css += `\n\n${cssMarker}\n.receipt-edit-preview {\n  min-height: 0;\n  max-height: calc(100dvh - 250px);\n  overflow-y: auto;\n  overscroll-behavior: contain;\n  scrollbar-gutter: stable;\n  padding: 0 5px 96px 0;\n}\n.receipt-edit-preview > :last-child { margin-bottom: 0; }\n.receipt-supplier-original {\n  display: grid;\n  gap: 12px;\n  min-height: 0;\n}\n.receipt-supplier-original-frame {\n  display: block;\n  width: 100%;\n  height: min(70dvh, 900px);\n  min-height: 520px;\n  border: 1px solid var(--line);\n  border-radius: 14px;\n  background: #fff;\n}\n.receipt-blank-strip-total {\n  flex: 0 0 auto;\n  display: grid;\n  justify-items: end;\n  gap: 1px;\n  white-space: nowrap;\n}\n.receipt-blank-strip-total small { color: var(--muted); font-size: 10px; font-weight: 600; }\n.receipt-blank-strip-total b { color: var(--ink); font-size: 13px; }\n@media (max-width: 760px) {\n  .receipt-edit-preview {\n    max-height: none;\n    overflow: visible;\n    padding: 8px 0 24px;\n  }\n  .receipt-supplier-original-frame { min-height: 420px; height: 68dvh; }\n}\n`;
  changed = true;
}

for (const [source, tokens, label] of [
  [resources, ['originalPreviewUrl', 'file_version=1&disposition=inline'], 'API оригинала'],
  [page, ['documentsApi.originalPreviewUrl'], 'импорт оригинала'],
  [editor, ['receipt-supplier-original-frame', 'Оригинал поставщика · без корректировок', 'Открыть оригинал в новой вкладке', 'Итого по {tickets.length} бланкам'], 'редактор'],
  [css, [cssMarker, 'max-height: calc(100dvh - 250px)', 'padding: 0 5px 96px 0'], 'стили'],
]) {
  for (const token of tokens) {
    if (!source.includes(token)) throw new Error(`Не подтверждено требование ${label}: ${token}`);
  }
}
if (editor.includes("Авиа-бланк'} с сохранёнными корректировками")) {
  throw new Error('Оригинальный авиа PDF всё ещё подменяется скорректированным представлением.');
}

if (changed) {
  await writeFile(resourcesUrl, resources, 'utf8');
  await writeFile(pageUrl, page, 'utf8');
  await writeFile(editorUrl, editor, 'utf8');
  await writeFile(cssUrl, css, 'utf8');
  console.log('Требования клиента по PDF-предпросмотру и оригиналу применены.');
} else {
  console.log('Требования клиента по PDF-предпросмотру и оригиналу уже применены.');
}
