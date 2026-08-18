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
if (!page.includes('function freshSupplierDocumentUrl(url)')) {
  page = replaceRequired(page, pageUrlHelper, pageFreshHelper, 'helper URL реестра');
}

const rowCorrectedStable = `window.open(inlineSupplierDocumentUrl(d.originalUrl), '_blank', 'noopener,noreferrer')`;
const rowCorrectedFresh = `window.open(freshSupplierDocumentUrl(d.originalUrl), '_blank', 'noopener,noreferrer')`;
page = replaceRequired(page, rowCorrectedStable, rowCorrectedFresh, 'кнопка исправленного оригинала в реестре');

// IMPORTANT: ReceiptBrandDocumentDrawer has an early return while it is closed.
// Every hook must stay above that return or React will see a different hook
// count between the closed and opened renders (production error #310).
const previewModeHook = `  const [previewMode, setPreviewMode] = useState('agency');`;
const nonceHookBlock = `${previewModeHook}\n  const [supplierPdfNonce, setSupplierPdfNonce] = useState(0);\n  useEffect(() => {\n    if (open) setSupplierPdfNonce(Date.now());\n  }, [open, originalUrl]);`;
if (!editor.includes('const [supplierPdfNonce, setSupplierPdfNonce] = useState(0);')) {
  editor = replaceRequired(editor, previewModeHook, nonceHookBlock, 'порядок hooks до раннего return');
}

const sourceUrlAnchor = `  const sourcePdfUrl = inlineSupplierDocumentUrl(originalUrl);\n  const sourceOriginalPdfUrl = inlineSupplierDocumentUrl(sourceOriginalUrl);`;
const sourceUrlFresh = `${sourceUrlAnchor}\n  const freshSupplierPdfUrl = (url, nonce = Date.now()) => {\n    if (!url || url.startsWith('blob:')) return url;\n    return \`${'${url}'}${'${url.includes(\'?\') ? \'&\' : \'?\'}'}_pdf=${'${nonce}'}\`;\n  };\n  const displayedSupplierPdfUrl = sourcePdfUrl ? freshSupplierPdfUrl(sourcePdfUrl, supplierPdfNonce || 'initial') : '';`;

// Repair a working tree that was already mutated by the previous buggy patch.
const oldLateHookSource = `${sourceUrlAnchor}\n  const [supplierPdfNonce, setSupplierPdfNonce] = useState(0);\n  const freshSupplierPdfUrl = (url, nonce = Date.now()) => {\n    if (!url || url.startsWith('blob:')) return url;\n    return \`${'${url}'}${'${url.includes(\'?\') ? \'&\' : \'?\'}'}_pdf=${'${nonce}'}\`;\n  };\n  useEffect(() => {\n    if (open) setSupplierPdfNonce(Date.now());\n  }, [open, originalUrl]);\n  const displayedSupplierPdfUrl = sourcePdfUrl ? freshSupplierPdfUrl(sourcePdfUrl, supplierPdfNonce || 'initial') : '';`;
if (editor.includes(oldLateHookSource)) {
  editor = editor.replace(oldLateHookSource, sourceUrlFresh);
  changed = true;
} else {
  editor = replaceRequired(editor, sourceUrlAnchor, sourceUrlFresh, 'cache-buster drawer');
}

const frameStable = `<iframe className="receipt-supplier-original-frame" src={sourcePdfUrl} title="Оригинал поставщика с правками" />`;
const frameFresh = `<iframe className="receipt-supplier-original-frame" src={displayedSupplierPdfUrl} title="Оригинал поставщика с правками" />`;
editor = replaceRequired(editor, frameStable, frameFresh, 'iframe исправленного оригинала');

const buttonStable = `onClick={() => window.open(sourcePdfUrl, '_blank', 'noopener,noreferrer')}>Оригинал поставщика с корректировками</Button>`;
const buttonFresh = `onClick={() => window.open(freshSupplierPdfUrl(sourcePdfUrl), '_blank', 'noopener,noreferrer')}>Оригинал поставщика с корректировками</Button>`;
editor = replaceRequired(editor, buttonStable, buttonFresh, 'кнопка исправленного оригинала');

for (const [source, tokens, label] of [
  [page, ['freshSupplierDocumentUrl', '_pdf=${Date.now()}', 'Оригинал с правками'], 'реестр'],
  [editor, ['supplierPdfNonce', 'displayedSupplierPdfUrl', 'freshSupplierPdfUrl(sourcePdfUrl)', '_pdf=${nonce}'], 'drawer'],
]) {
  for (const token of tokens) {
    if (!source.includes(token)) throw new Error(`Не подтвержден fresh corrected PDF ${label}: ${token}`);
  }
}

const drawerStart = editor.indexOf('export function ReceiptBrandDocumentDrawer');
const nonceHookIndex = editor.indexOf('const [supplierPdfNonce, setSupplierPdfNonce] = useState(0);', drawerStart);
const earlyReturnIndex = editor.indexOf('if (!open || !draft) return null;', drawerStart);
if (drawerStart < 0 || nonceHookIndex < 0 || earlyReturnIndex < 0 || nonceHookIndex > earlyReturnIndex) {
  throw new Error('Hook supplierPdfNonce должен вызываться до раннего return ReceiptBrandDocumentDrawer.');
}
const drawerTail = editor.slice(earlyReturnIndex, editor.indexOf('\n}', earlyReturnIndex) > 0 ? editor.indexOf('\n}', earlyReturnIndex) : undefined);
if (drawerTail.includes('const [supplierPdfNonce, setSupplierPdfNonce] = useState(0);')) {
  throw new Error('Обнаружен условный useState supplierPdfNonce после раннего return.');
}

if (changed) {
  await writeFile(pageUrl, page, 'utf8');
  await writeFile(editorUrl, editor, 'utf8');
  console.log('Исправленный оригинал PDF открывается свежим URL, а hooks остаются стабильными при открытии drawer.');
} else {
  console.log('Fresh corrected supplier PDF и безопасный порядок hooks уже настроены.');
}
