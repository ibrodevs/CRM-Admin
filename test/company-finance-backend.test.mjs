import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const financeUrl = new URL('../js/page_company_finance.jsx', import.meta.url);
const resourcesUrl = new URL('../js/api/resources.js', import.meta.url);

test('дата договора использует общий календарь CRM', async () => {
  const source = await readFile(financeUrl, 'utf8');

  assert.match(source, /ConfirmDialog, DateField, Drawer/);
  assert.match(source, /<DateField value=\{contractDate\} onChange=\{setContractDate\}/);
  assert.doesNotMatch(source, /<Input type="date" value=\{contractDate\}/);
  assert.match(source, /contractDate instanceof Date/);
});

test('финансовые условия загружаются и сохраняются через профильный CRM endpoint', async () => {
  const source = await readFile(financeUrl, 'utf8');
  const resources = await readFile(resourcesUrl, 'utf8');

  assert.match(source, /crmApi\.companyFinancialConditions\(companyId/);
  assert.match(source, /crmApi\.saveCompanyFinancialConditions\(companyId/);
  assert.match(source, /Однократная миграция данных/);
  assert.match(resources, /companies\/\$\{id\}\/financial-conditions\//);
  assert.match(resources, /method: 'PUT'/);
});

test('отображение поддерживает название шаблона, возвращённое backend', async () => {
  const source = await readFile(financeUrl, 'utf8');

  assert.match(source, /a\.templateName \|\| feeTemplate\(a\.template\)\.name/);
});
