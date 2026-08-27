import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pageUrl = new URL('../js/page_fulfillment.jsx', import.meta.url);

test('main Next button reads current child review statuses after sequential review', async () => {
  const page = await readFile(pageUrl, 'utf8');

  assert.match(page, /Group review rows must use the latest child reviewStatus values/);
  assert.match(page, /const rows = \(\(\) => \{/);
  assert.doesNotMatch(page, /const rows = React\.useMemo\(\(\) => \{/);
  assert.match(page, /receiptGroupNeedsSequentialReview\(r\.f\)/);
  // Непроверенные бланки удерживают последний шаг «В заказ», а не переход
  // между шагами: между ними оператор ходит свободно.
  assert.match(page, /disabled=\{processing \|\| !toAdd\.length \|\| pendingReview > 0/);
  assert.doesNotMatch(page, /doneRows\.length > 0 && pendingReview === 0/);
});
