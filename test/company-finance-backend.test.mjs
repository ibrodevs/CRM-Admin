import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from './helpers/source.mjs';

const financeUrl = new URL('../src/modules/companies/ui/CompanyFinance.jsx', import.meta.url);
const resourcesUrl = new URL('../src/modules/companies/api/companiesApi.js', import.meta.url);

test('дата договора использует общий календарь CRM', async () => {
  const source = await readFile(financeUrl, 'utf8');

  assert.match(source, /import \{ Button \} from [^;]+Button\.jsx/);
  assert.match(source, /import \{ Drawer \} from [^;]+Overlays\.jsx/);
  assert.match(source, /import \{ DateField \} from [^;]+DateFields\.jsx/);
  assert.match(source, /<DateField value=\{contractDate\} onChange=\{setContractDate\}/);
  assert.doesNotMatch(source, /<Input type="date" value=\{contractDate\}/);
  assert.match(source, /contractDate instanceof Date/);
});

test('финансовые условия загружаются и сохраняются через профильный CRM endpoint', async () => {
  const source = await readFile(financeUrl, 'utf8');
  const resources = await readFile(resourcesUrl, 'utf8');

  assert.match(source, /companiesApi\.companyFinancialConditions\(companyId/);
  assert.match(source, /companiesApi\.saveCompanyFinancialConditions\(companyId/);
  assert.match(source, /Однократная миграция только полноценных старых условий/);
  assert.match(resources, /companies\/\$\{id\}\/financial-conditions\//);
  assert.match(resources, /method: 'PUT'/);
});

test('отображение поддерживает название шаблона, возвращённое backend', async () => {
  const source = await readFile(financeUrl, 'utf8');

  assert.match(source, /a\.templateName \|\| feeTemplate\(a\.template\)\.name/);
});
