import { readFile, writeFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
let source = await readFile(pageUrl, 'utf8');
let changed = false;

const oldNote = 'Текущий бланк готов к сохранению. После сохранения система откроет следующий автоматически.';
const newNote = 'Изменения применяются только к выбранному билету. Текущий бланк готов к сохранению. После сохранения система откроет следующий автоматически.';
const groupedNote = 'Общие исправления будут применены ко всем';
if (!source.includes(newNote) && !source.includes(groupedNote)) {
  if (!source.includes(oldNote)) throw new Error('Не найдена подсказка текущего бланка.');
  source = source.replace(oldNote, newNote);
  changed = true;
}

const previewOld = 'Предпросмотр показывает только выбранный бланк и обновляется сразу.';
const previewNew = 'Предпросмотр обновляется сразу и показывает только выбранный бланк.';
if (source.includes(previewOld) && !source.includes(previewNew)) {
  source = source.replace(previewOld, previewNew);
  changed = true;
}

const simpleAction = `                                      }}>{(r.f.subReceipts || []).length > 1 ? 'Проверить бланки по очереди' : st.action}</button>`;
const hardenedAction = `                                      }}>{(r.f.subReceipts || []).length > 1 ? 'Проверить бланки по очереди' : (displayStatus === 'Требует проверки' ? 'Проверить и заполнить' : st.action)}</button>`;
if (!source.includes(hardenedAction)) {
  if (!source.includes(simpleAction)) throw new Error('Не найден action последовательной проверки.');
  source = source.replace(simpleAction, hardenedAction);
  changed = true;
}

const updatePattern = /(const updateSubReceipt = \(fileId, subIndex, parsed\) => \{[\s\S]*?setFiles\(\(cur\) => cur\.map\(\(file\) => \{[\s\S]*?\}\)\);)\n\s*setReviewed\(\(cur\) => \(\{ \.\.\.cur, \[fileId\]: true \}\)\);(\n\s*\};\n\s*const markReviewed)/;
if (updatePattern.test(source)) {
  source = source.replace(updatePattern, '$1$2');
  changed = true;
}

const updateBlock = source.match(/const updateSubReceipt = \(fileId, subIndex, parsed\) => \{[\s\S]*?\n  \};\n  const markReviewed/);
if (!updateBlock) throw new Error('Не найден updateSubReceipt после последовательного patch.');
if (/setReviewed\(\(cur\)/.test(updateBlock[0])) throw new Error('Отдельный бланк всё ещё преждевременно помечает всю группу проверенной.');

// Important: child reviewStatus changes can leave all parent summary fields unchanged.
// The old memo depended only on parent ticketNo/passenger/total/route, so rows kept an
// outdated file snapshot. receiptGroupNeedsSequentialReview then continued to see a
// pending child and the main «Далее» button stayed disabled after the final review.
const rowsMarker = '// Group review rows must use the latest child reviewStatus values.';
if (!source.includes(rowsMarker)) {
  const rowsPattern = /  const rows = React\.useMemo\(\(\) => \{\n    const seen = new Set\(\);\n    return files\.map\(\(f\) => \(\{\n      f,\n      pending: f\.status !== 'done',\n      status: f\.status === 'done' \? receiptStatus\(f\.parsed, seen, f\.type, f\.error\) : \(f\.status === 'scanning' \? 'Сканируется' : 'В очереди'\),\n    \}\)\);\n  \}, \[files\.map\(\(f\) => f\.id \+ f\.status \+ \(f\.parsed \? \[f\.parsed\.ticketNo, f\.parsed\.passenger, f\.parsed\.total, routeSummary\(f\.parsed\)\]\.join\('\|'\) : ''\)\)\.join\(','\)\]\);/;
  if (!rowsPattern.test(source)) throw new Error('Не найден memo-блок строк импорта для исправления кнопки «Далее».');
  source = source.replace(rowsPattern, `  ${rowsMarker}\n  const rows = (() => {\n    const seen = new Set();\n    return files.map((f) => ({\n      f,\n      pending: f.status !== 'done',\n      status: f.status === 'done' ? receiptStatus(f.parsed, seen, f.type, f.error) : (f.status === 'scanning' ? 'Сканируется' : 'В очереди'),\n    }));\n  })();`);
  changed = true;
}

for (const token of [
  rowsMarker,
  'const rows = (() => {',
  'receiptGroupNeedsSequentialReview(r.f)',
  'doneRows.length > 0 && pendingReview === 0',
]) {
  if (!source.includes(token)) throw new Error(`Не подтверждено разблокирование «Далее»: ${token}`);
}

if (changed) await writeFile(pageUrl, source, 'utf8');
console.log(changed ? 'Совместимость последовательного редактора сохранена, «Далее» разблокируется после последнего бланка.' : 'Совместимость последовательного редактора уже настроена.');

// This compatibility script is deliberately the last receipt patch in all
// predev/prebuild/pretest chains. Apply the client PDF requirements here so
// older receipt patches cannot overwrite immutable-original or preview fixes.
await import('./apply-receipt-client-pdf-requirements.mjs');
