import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile(new URL('../js/page_fulfillment.jsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../app/receipt-ui-fixes.css', import.meta.url), 'utf8');


test('grouped railway receipts are reviewed as a sequential wizard', () => {
  assert.match(page, /function receiptBlankIsReviewed\(ticket\)/);
  assert.match(page, /function receiptGroupNeedsSequentialReview\(file\)/);
  assert.match(page, /const firstUnreviewed = tickets\.findIndex/);
  assert.match(page, /Последовательная проверка бланков/);
  assert.match(page, /Сохранить и далее/);
  assert.match(page, /Сохранить и завершить проверку/);
  assert.match(page, /setActiveBlankIndex\(safeBlankIndex \+ 1\)/);
});


test('each child ticket gets its own reviewed state before the parent can finish', () => {
  assert.match(page, /reviewStatus: 'reviewed'/);
  assert.match(page, /reviewedAt = new Date\(\)\.toISOString\(\)/);
  assert.match(page, /receiptGroupNeedsSequentialReview\(r\.f\)/);
  assert.match(page, /Проверить бланки по очереди/);
  assert.match(page, /receiptBlankIsReviewed\(subReceipt\) \? 'Проверено' : 'Не проверено'/);

  const updateBlock = page.match(/const updateSubReceipt = \(fileId, subIndex, parsed\) => \{[\s\S]*?\n  \};\n  const markReviewed/);
  assert.ok(updateBlock, 'updateSubReceipt block must exist');
  assert.doesNotMatch(updateBlock[0], /setReviewed\(\(cur\)/);
});


test('sequential review validates critical ticket data and shows progress', () => {
  for (const field of ['ФИО пассажира', 'номер билета', 'маршрут', 'номер поезда', 'стоимость билета']) {
    assert.match(page, new RegExp(field));
  }
  assert.match(page, /role="progressbar"/);
  assert.match(styles, /\.receipt-sequential-review/);
  assert.match(styles, /\.receipt-sequential-progress/);
  assert.match(styles, /\.receipt-sequential-steps/);
  assert.match(styles, /\.receipt-sequential-validation/);
});
