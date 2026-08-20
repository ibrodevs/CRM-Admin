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
  if (!source.includes(from)) throw new Error(`Не найден фрагмент для corrected supplier PDF: ${label}`);
  changed = true;
  return source.replace(from, to);
}

// The uploaded supplier PDF remains the immutable audit source. The default
// supplier endpoint returns a derived copy with safe financial corrections;
// source=1 always returns the originally uploaded PDF.
const originalApi = "  originalPreviewUrl: (id) => apiPath(`documents/${id}/download/?file_version=1&disposition=inline`),";
const supplierApis = `${originalApi}\n  supplierPreviewUrl: (id) => apiPath(\`documents/\${id}/supplier-pdf/?disposition=inline\`),\n  supplierSourcePreviewUrl: (id) => apiPath(\`documents/\${id}/supplier-pdf/?source=1&disposition=inline\`),`;
resources = replaceRequired(resources, originalApi, supplierApis, 'API рабочей и исходной копии');

const importedOriginal = `            originalUrl: (result.source_document_id || imported.document_id)\n              ? documentsApi.originalPreviewUrl(result.source_document_id || imported.document_id)\n              : item.originalUrl,`;
const importedSupplier = `            originalUrl: (result.source_document_id || imported.document_id)\n              ? documentsApi.supplierPreviewUrl(result.source_document_id || imported.document_id)\n              : item.originalUrl,\n            sourceOriginalUrl: (result.source_document_id || imported.document_id)\n              ? documentsApi.supplierSourcePreviewUrl(result.source_document_id || imported.document_id)\n              : item.sourceOriginalUrl,`;
page = replaceRequired(page, importedOriginal, importedSupplier, 'URL после распознавания');

const registryOriginal = `        originalUrl: document.supplierBlank?.originalUrl || (document.serverId ? documentsApi.previewUrl(document.serverId) : null),`;
const registrySupplier = `        originalUrl: document.serverId ? documentsApi.supplierPreviewUrl(document.serverId) : document.supplierBlank?.originalUrl,\n        sourceOriginalUrl: document.serverId ? documentsApi.supplierSourcePreviewUrl(document.serverId) : document.supplierBlank?.sourceOriginalUrl,`;
page = replaceRequired(page, registryOriginal, registrySupplier, 'URL сохранённого документа');

const introOld = '                Единый реестр авиа, ЖД, отельных и трансферных документов. Оригиналы поставщиков сохраняются без изменений.';
const introNew = '                Единый реестр авиа, ЖД, отельных и трансферных документов. Исходный PDF хранится отдельно без изменений; финансовые правки переносятся в рабочую копию оригинала поставщика.';
page = replaceRequired(page, introOld, introNew, 'описание реестра');

const finishSupplierOld = `        supplierBlank: { name: r.f.name, size: r.f.size, byteSize: r.f.byteSize, mime: r.f.mime,\n          lastModified: r.f.lastModified, originalUrl: r.f.originalUrl, total: Number(p.originalTotal) || Number(p.total) || 0, currency: p.currency },`;
const finishSupplierNew = `        supplierBlank: { name: r.f.name, size: r.f.size, byteSize: r.f.byteSize, mime: r.f.mime,\n          lastModified: r.f.lastModified,\n          originalUrl: documentsApi.supplierPreviewUrl(confirmed[index].document_id),\n          sourceOriginalUrl: documentsApi.supplierSourcePreviewUrl(confirmed[index].document_id),\n          total: Number(p.originalTotal) || Number(p.total) || 0, currency: p.currency },`;
page = replaceRequired(page, finishSupplierOld, finishSupplierNew, 'локальные ссылки после подтверждения');

const finishDocsAnchor = `      }));\n      const docs = toAdd.map((r, index) => {`;
const finishDocsWarning = `      }));\n      const supplierPdfManual = confirmed.filter((result) => result?.supplier_pdf_correction?.status === 'manual_required').length;\n      if (supplierPdfManual) {\n        toast('Данные сохранены. Для ' + supplierPdfManual + ' файл. не удалось безопасно перенести все суммы в PDF поставщика — исходник оставлен без частичных правок.', 'err');\n      }\n      const docs = toAdd.map((r, index) => {`;
page = replaceRequired(page, finishDocsAnchor, finishDocsWarning, 'предупреждение при небезопасной подстановке');

const savedToastOld = `      toast(asDraft ? 'Черновик квитанции сохранён' : 'Проверенные данные и настройки бланка сохранены', 'ok');`;
const savedToastNew = `      const supplierPdfCorrection = savedDocument?.supplier_pdf_correction;\n      if (!asDraft && supplierPdfCorrection?.status === 'manual_required') {\n        toast('Данные сохранены, но PDF поставщика не опубликован с частичными правками: одна или несколько сумм не найдены безопасно.', 'err');\n      } else if (!asDraft && supplierPdfCorrection?.status === 'corrected') {\n        toast('Данные сохранены · суммы перенесены в копию оригинала поставщика с исходным шрифтом', 'ok');\n      } else {\n        toast(asDraft ? 'Черновик квитанции сохранён' : 'Проверенные данные и настройки бланка сохранены', 'ok');\n      }`;
page = replaceRequired(page, savedToastOld, savedToastNew, 'результат сохранения PDF');

const mathDrawerSourceOld = `      sub={'Бланк поставщика: ' + recMoney(Number(file.parsed.originalTotal) || Number(file.parsed.total) || 0, cur) + ' — сохраняется без изменений'}`;
const mathDrawerSourceNew = `      sub={'Исходный v1: ' + recMoney(Number(file.parsed.originalTotal) || Number(file.parsed.total) || 0, cur) + ' · после сохранения сумма сразу переносится в рабочую копию PDF'}`;
page = replaceRequired(page, mathDrawerSourceOld, mathDrawerSourceNew, 'подсказка математики PDF');

page = replaceRequired(
  page,
  '<RSub>Данные и клиентская версия</RSub>',
  '<RSub>Данные и рабочий оригинал</RSub>',
  'заголовок рабочей копии',
);
page = replaceRequired(
  page,
  'Здесь меняются только данные CRM и клиентская математика. Исходные файлы поставщиков остаются в v1 без изменений.',
  'Финансовые изменения переносятся в рабочую копию PDF поставщика. Загруженный исходный v1 хранится отдельно без изменений.',
  'описание рабочей копии',
);
if (!page.includes('стоимость сразу попадёт в рабочий PDF')) {
  page = replaceRequired(
    page,
    '<Icon name="check" style={{ width: 16, height: 16 }} /> v1 поставщика не меняется',
    '<Icon name="check" style={{ width: 16, height: 16 }} /> стоимость сразу попадёт в рабочий PDF',
    'статус рабочей копии',
  );
}

const rowOriginalOld = `{d.originalUrl && <Button size="sm" variant="ghost" icon="eye" onClick={() => window.open(inlineSupplierDocumentUrl(d.originalUrl), '_blank', 'noopener,noreferrer')}>Оригинал</Button>}`;
const rowOriginalNew = `{d.originalUrl && <Button size="sm" variant="ghost" icon="eye" onClick={() => window.open(inlineSupplierDocumentUrl(d.originalUrl), '_blank', 'noopener,noreferrer')}>Оригинал с правками</Button>}\n                          {d.sourceOriginalUrl && <Button size="sm" variant="ghost" onClick={() => window.open(inlineSupplierDocumentUrl(d.sourceOriginalUrl), '_blank', 'noopener,noreferrer')}>Исходный</Button>}`;
if (!(page.includes('>Оригинал с правками</Button>') && page.includes('>Исходный</Button>'))) {
  page = replaceRequired(page, rowOriginalOld, rowOriginalNew, 'кнопки оригинала в реестре');
}

const brandCallOld = `<ReceiptBrandDocumentDrawer open={!!brandEdit} type={brandEdit?.editorType} draft={brandEdit?.parsed}\n        originalUrl={brandEdit?.originalUrl} onClose={() => setBrandEdit(null)} />`;
const brandCallNew = `<ReceiptBrandDocumentDrawer open={!!brandEdit} type={brandEdit?.editorType} draft={brandEdit?.parsed}\n        originalUrl={brandEdit?.originalUrl} sourceOriginalUrl={brandEdit?.sourceOriginalUrl}\n        onClose={() => setBrandEdit(null)} />`;
page = replaceRequired(page, brandCallOld, brandCallNew, 'drawer реестра');

const importBrandCallOld = `<ReceiptBrandDocumentDrawer open={!!brandFile} type={brandFile?.type} draft={brandFile?.parsed}\n        originalUrl={brandFile?.originalUrl} onClose={() => setBrandId(null)} />`;
const importBrandCallNew = `<ReceiptBrandDocumentDrawer open={!!brandFile} type={brandFile?.type} draft={brandFile?.parsed}\n        originalUrl={brandFile?.originalUrl} sourceOriginalUrl={brandFile?.sourceOriginalUrl}\n        onClose={() => setBrandId(null)} />`;
if (page.includes(importBrandCallOld) || page.includes(importBrandCallNew)) {
  page = replaceRequired(page, importBrandCallOld, importBrandCallNew, 'drawer импорта');
}

const drawerSignatureOld = `export function ReceiptBrandDocumentDrawer({ open, type, draft, originalUrl, onClose }) {`;
const drawerSignatureNew = `export function ReceiptBrandDocumentDrawer({ open, type, draft, originalUrl, sourceOriginalUrl, onClose }) {`;
editor = replaceRequired(editor, drawerSignatureOld, drawerSignatureNew, 'параметры предпросмотра');

const sourceUrlOld = `  const sourcePdfUrl = inlineSupplierDocumentUrl(originalUrl);`;
const sourceUrlNew = `  const sourcePdfUrl = inlineSupplierDocumentUrl(originalUrl);\n  const sourceOriginalPdfUrl = inlineSupplierDocumentUrl(sourceOriginalUrl);`;
editor = replaceRequired(editor, sourceUrlOld, sourceUrlNew, 'две версии PDF');

const originalNoticeOld = `<div className="receipt-source-notice"><Icon name="lock" /><div><b>Оригинал поставщика · без корректировок</b>\n            <span>Показывается исходный PDF версии 1. Изменения из редактора применяются только к бланку агентства и не изменяют этот файл.</span></div></div>`;
const originalNoticeNew = `<div className="receipt-source-notice"><Icon name="checkCircle" /><div><b>Оригинал поставщика · с сохранёнными корректировками</b>\n            <span>Финансовые изменения перенесены прямо в копию исходного PDF с использованием его встроенного шрифта и исходной верстки. Загруженный оригинал хранится отдельно без изменений.</span></div></div>`;
editor = replaceRequired(editor, originalNoticeOld, originalNoticeNew, 'описание исправленного оригинала');

const originalFrameOld = `<iframe className="receipt-supplier-original-frame" src={sourcePdfUrl} title="Оригинал поставщика" />`;
const originalFrameNew = `<iframe className="receipt-supplier-original-frame" src={sourcePdfUrl} title="Оригинал поставщика с правками" />`;
if (!editor.includes('title="Оригинал поставщика с правками"')) {
  editor = replaceRequired(editor, originalFrameOld, originalFrameNew, 'заголовок PDF');
}

const footerOld = `{sourcePdfUrl && <Button variant="secondary" icon="eye" onClick={() => window.open(sourcePdfUrl, '_blank', 'noopener,noreferrer')}>Открыть оригинал в новой вкладке</Button>}`;
const footerNew = `{sourcePdfUrl && <Button variant="secondary" icon="eye" onClick={() => window.open(sourcePdfUrl, '_blank', 'noopener,noreferrer')}>Открыть оригинал с правками</Button>}\n        {sourceOriginalPdfUrl && <Button variant="ghost" onClick={() => window.open(sourceOriginalPdfUrl, '_blank', 'noopener,noreferrer')}>Исходный оригинал</Button>}`;
if (!(editor.includes('>Оригинал поставщика с корректировками</Button>') && editor.includes('>Исходный файл поставщика</Button>'))) {
  editor = replaceRequired(editor, footerOld, footerNew, 'кнопки PDF в drawer');
}

// Four footer actions no longer compete for one horizontal row. The dedicated
// wrapper lets the long corrected-original label wrap instead of being clipped
// by the Drawer boundary at normal zoom and on narrower screens.
const footerActionsOld = `footer={<>\n        {sourcePdfUrl && <Button variant="secondary" icon="eye" onClick={() => window.open(sourcePdfUrl, '_blank', 'noopener,noreferrer')}>Открыть оригинал с правками</Button>}\n        {sourceOriginalPdfUrl && <Button variant="ghost" onClick={() => window.open(sourceOriginalPdfUrl, '_blank', 'noopener,noreferrer')}>Исходный оригинал</Button>}\n        <Button variant="secondary" onClick={onClose}>Закрыть</Button>\n        {(output.mode !== 'original' || type === 'ЖД' || type === 'Авиа') && <Button icon="download" onClick={printReceipt}>Печать / сохранить PDF</Button>}\n      </>}>`;
const footerActionsNew = `footer={<div className="receipt-supplier-footer-actions">\n        {sourcePdfUrl && <Button variant="secondary" icon="eye" onClick={() => window.open(sourcePdfUrl, '_blank', 'noopener,noreferrer')}>Открыть оригинал с правками</Button>}\n        {sourceOriginalPdfUrl && <Button variant="ghost" onClick={() => window.open(sourceOriginalPdfUrl, '_blank', 'noopener,noreferrer')}>Исходный оригинал</Button>}\n        <Button variant="secondary" onClick={onClose}>Закрыть</Button>\n        {(output.mode !== 'original' || type === 'ЖД' || type === 'Авиа') && <Button icon="download" onClick={printReceipt}>Печать / сохранить PDF</Button>}\n      </div>}>`;
if (!editor.includes('footer={<div className="receipt-supplier-footer-actions">')) {
  editor = replaceRequired(editor, footerActionsOld, footerActionsNew, 'адаптивный footer PDF');
}

const cssMarker = '/* Corrected supplier PDF: footer actions must stay inside drawer. */';
if (!css.includes(cssMarker)) {
  css += `\n\n${cssMarker}\n.receipt-supplier-footer-actions {\n  width: 100%;\n  min-width: 0;\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 8px;\n}\n.receipt-supplier-footer-actions > .btn {\n  width: 100%;\n  min-width: 0;\n  max-width: 100%;\n  height: auto;\n  min-height: 40px;\n  padding: 8px 12px;\n  white-space: normal;\n  line-height: 1.2;\n  text-align: center;\n  overflow-wrap: anywhere;\n}\n@media (max-width: 620px) {\n  .receipt-supplier-footer-actions {\n    grid-template-columns: 1fr;\n  }\n}\n`;
  changed = true;
}

for (const [source, tokens, label] of [
  [resources, ['supplierPreviewUrl', 'supplierSourcePreviewUrl', 'supplier-pdf/?source=1'], 'API'],
  [page, ['documentsApi.supplierPreviewUrl', 'documentsApi.supplierSourcePreviewUrl', 'Оригинал с правками', 'Исходный', 'supplier_pdf_correction', 'после сохранения сумма сразу переносится в рабочую копию PDF', 'стоимость сразу попадёт в рабочий PDF'], 'страница'],
  [editor, ['sourceOriginalUrl', 'Оригинал поставщика · с сохранёнными корректировками', 'Оригинал поставщика с корректировками', 'Исходный файл поставщика', 'receipt-supplier-footer-actions'], 'предпросмотр'],
  [css, [cssMarker, 'grid-template-columns: repeat(2, minmax(0, 1fr))', 'white-space: normal'], 'адаптивный footer'],
]) {
  for (const token of tokens) {
    if (!source.includes(token)) throw new Error(`Не подтвержден corrected supplier PDF ${label}: ${token}`);
  }
}

if (editor.includes('Изменения из редактора применяются только к бланку агентства и не изменяют этот файл.')) {
  throw new Error('Старая семантика неизменяемого рабочего оригинала всё ещё активна.');
}

if (changed) {
  await writeFile(resourcesUrl, resources, 'utf8');
  await writeFile(pageUrl, page, 'utf8');
  await writeFile(editorUrl, editor, 'utf8');
  await writeFile(cssUrl, css, 'utf8');
  console.log('Рабочий оригинал поставщика отражает финансовые корректировки, а кнопки PDF не выходят за границы drawer.');
} else {
  console.log('Corrected supplier PDF и адаптивные действия уже настроены.');
}
