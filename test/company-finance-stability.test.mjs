import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const financeUrl = new URL('../js/page_company_finance.jsx', import.meta.url);

test('неполные финансовые данные нормализуются до отображения', async () => {
  const source = await readFile(financeUrl, 'utf8');

  assert.match(source, /function cfNormalizeAgreement\(/);
  assert.match(source, /function cfNormalizeFinancialConditions\(/);
  assert.match(source, /const normalizedRemote = cfNormalizeFinancialConditions\(remote\?\.value\)/);
  assert.match(source, /const legacyValue = cfNormalizeFinancialConditions\(legacy\?\.value\)/);
});

test('пустая служебная запись не считается настроенными условиями', async () => {
  const source = await readFile(financeUrl, 'utf8');

  assert.match(source, /const configured = contracts\.some/);
  assert.match(source, /if \(!configured\) return null/);
  assert.match(source, /Создать финансовые условия/);
});

test('редактор не падает при отсутствующем правиле сбора', async () => {
  const source = await readFile(financeUrl, 'utf8');

  assert.match(source, /const fee = \(fees\[tab\] && fees\[tab\]\[f\.key\]\) \|\| \{ type: 'fixed', value: 0 \}/);
  assert.doesNotMatch(source, /const fee = fees\[tab\]\[f\.key\]/);
});
