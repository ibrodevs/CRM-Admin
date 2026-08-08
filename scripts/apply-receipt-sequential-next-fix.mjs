import { readFile, writeFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);
let page = await readFile(pageUrl, 'utf8');
let changed = false;

const marker = '// Group review rows must use the latest child reviewStatus values.';
if (!page.includes(marker)) {
  const rowsPattern = /  const rows = React\.useMemo\(\(\) => \{\n    const seen = new Set\(\);\n    return files\.map\(\(f\) => \(\{\n      f,\n      pending: f\.status !== 'done',\n      status: f\.status === 'done' \? receiptStatus\(f\.parsed, seen, f\.type, f\.error\) : \(f\.status === 'scanning' \? 'Сканируется' : 'В очереди'\),\n    \}\)\);\n  \}, \[files\.map\(\(f\) => f\.id \+ f\.status \+ \(f\.parsed \? \[f\.parsed\.ticketNo, f\.parsed\.passenger, f\.parsed\.total, routeSummary\(f\.parsed\)\]\.join\('\|'\) : ''\)\)\.join\(','\)\]\);/;

  if (!rowsPattern.test(page)) {
    throw new Error('Не найден memo-блок строк импорта для исправления кнопки «Далее».');
  }

  const rowsNext = `  ${marker}\n  // The child tickets are mutated independently while the parent totals can stay the same.\n  // Memoizing only parent fields leaves pendingReview on an old file snapshot and keeps\n  // the main «Далее» button disabled even after the last child blank is reviewed.\n  const rows = (() => {\n    const seen = new Set();\n    return files.map((f) => ({\n      f,\n      pending: f.status !== 'done',\n      status: f.status === 'done' ? receiptStatus(f.parsed, seen, f.type, f.error) : (f.status === 'scanning' ? 'Сканируется' : 'В очереди'),\n    }));\n  })();`;

  page = page.replace(rowsPattern, rowsNext);
  changed = true;
}

for (const token of [
  marker,
  'const rows = (() => {',
  'receiptGroupNeedsSequentialReview(r.f)',
  'doneRows.length > 0 && pendingReview === 0',
]) {
  if (!page.includes(token)) throw new Error(`Не подтверждено разблокирование «Далее»: ${token}`);
}

if (changed) await writeFile(pageUrl, page, 'utf8');
console.log(changed
  ? 'Кнопка «Далее» теперь пересчитывается по актуальным статусам всех дочерних бланков.'
  : 'Исправление кнопки «Далее» уже применено.');
