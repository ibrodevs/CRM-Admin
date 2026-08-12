import { readFile, writeFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
const editorUrl = new URL('../js/features/receipts/editor.jsx', import.meta.url);

let page = await readFile(pageUrl, 'utf8');
let editor = await readFile(editorUrl, 'utf8');
let changed = false;

function replaceRequired(source, from, to, label) {
  if (source.includes(to)) return source;
  if (!source.includes(from)) throw new Error(`Не найден фрагмент для fresh corrected PDF: ${label}`);
  changed = true;
  return source.replace(from, to);
}

// A supplier URL can serve the immutable source first and a corrected version
// after the user saves changes. Browsers may otherwise keep showing the first
// PDF response. Always give explicit user opens a unique URL while the backend
// also sends no-store headers.
const pageUrlHelper = `function inlineSupplierDocumentUrl(url) {\n  const value = String(url || '');\n  if (!value || value.startsWith('blob:') || !value.includes('/documents/')\n    || !value.includes('/download/') || value.includes('disposition=')) return value;\n  return \`${'${value}'}${'${value.includes(\'?\') ? \'&\' : \'?\'}'}disposition=inline\`;\n}`;
const pageFreshHelper = `${pageUrlHelper}\n\nfunction freshSupplierDocumentUrl(url) {\n  const value = inlineSupplierDocumentUrl(url);\n  if (!value || value.startsWith('blob:')) return value;\n  return \`${'${value}'}${'${value.includes(\'?\') ? \'&\' : \'?\'}'}_pdf=${'${Date.now()}'}\`;\n}`;
page = replaceRequired(page, pageUrlHelper, pageFreshHelper, 'helper URL реестра');

const rowCorrectedStable = `window.open(inlineSupplierDocumentUrl(d.originalUrl), '_blank', 'noopener,noreferrer')`;
const rowCorrectedFresh = `window.open(freshSupplierDocumentUrl(d.originalUrl), '_blank', 'noopener,noreferrer')`;
page = replaceRequired(page, rowCorrectedStable, rowCorrectedFresh, 'кнопка исправленного оригинала в реестре');

const sourceUrlAnchor = `  const sourcePdfUrl = inlineSupplierDocumentUrl(originalUrl);\n  const sourceOriginalPdfUrl = inlineSupplierDocumentUrl(sourceOriginalUrl);`;
const sourceUrlFresh = `${sourceUrlAnchor}\n  const [supplierPdfNonce, setSupplierPdfNonce] = useState(0);\n  const freshSupplierPdfUrl = (url, nonce = Date.now()) => {\n    if (!url || url.startsWith('blob:')) return url;\n    return \`${'${url}'}${'${url.includes(\'?\') ? \'&\' : \'?\'}'}_pdf=${'${nonce}'}\`;\n  };\n  useEffect(() => {\n    if (open) setSupplierPdfNonce(Date.now());\n  }, [open, originalUrl]);\n  const displayedSupplierPdfUrl = sourcePdfUrl ? freshSupplierPdfUrl(sourcePdfUrl, supplierPdfNonce || 'initial') : '';`;
editor = replaceRequired(editor, sourceUrlAnchor, sourceUrlFresh, 'cache-buster drawer');

const frameStable = `<iframe className="receipt-supplier-original-frame" src={sourcePdfUrl} title="Оригинал поставщика с правками" />`;
const frameFresh = `<iframe className="receipt-supplier-original-frame" src={displayedSupplierPdfUrl} title="Оригинал поставщика с правками" />`;
editor = replaceRequired(editor, frameStable, frameFresh, 'iframe исправленного оригинала');

const buttonStable = `onClick={() => window.open(sourcePdfUrl, '_blank', 'noopener,noreferrer')}>Открыть оригинал с правками</Button>`;
const buttonFresh = `onClick={() => window.open(freshSupplierPdfUrl(sourcePdfUrl), '_blank', 'noopener,noreferrer')}>Открыть оригинал с правками</Button>`;
editor = replaceRequired(editor, buttonStable, buttonFresh, 'кнопка исправленного оригинала');

for (const [source, tokens, label] of [
  [page, ['freshSupplierDocumentUrl', '_pdf=${Date.now()}', 'Оригинал с правками'], 'реестр'],
  [editor, ['supplierPdfNonce', 'displayedSupplierPdfUrl', 'freshSupplierPdfUrl(sourcePdfUrl)', '_pdf=${nonce}'], 'drawer'],
]) {
  for (const token of tokens) {
    if (!source.includes(token)) throw new Error(`Не подтвержден fresh corrected PDF ${label}: ${token}`);
  }
}

if (changed) {
  await writeFile(pageUrl, page, 'utf8');
  await writeFile(editorUrl, editor, 'utf8');
  console.log('Исправленный оригинал PDF всегда открывается по свежему URL без браузерного кэша.');
} else {
  console.log('Fresh corrected supplier PDF уже настроен.');
}
