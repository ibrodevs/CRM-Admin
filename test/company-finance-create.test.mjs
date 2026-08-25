import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const financeUrl = new URL('../js/page_company_finance.jsx', import.meta.url);

test('в карточке компании можно создать финансовые условия', async () => {
  const source = await readFile(financeUrl, 'utf8');

  assert.match(source, /function CompanyFinanceCreateDrawer\(/);
  assert.match(source, /Создать финансовые условия/);
  assert.match(source, /Новые финансовые условия/);
  assert.match(source, /onCreated=\{updateFin\}/);
  assert.match(source, /crmApi\.saveCompanyFinancialConditions\(companyId, prepared\)/);
});

test('создание условий формирует договор и первое дополнительное соглашение', async () => {
  const source = await readFile(financeUrl, 'utf8');

  assert.match(source, /contracts: \[contract\]/);
  assert.match(source, /agreements: \[agreement\]/);
  assert.match(source, /no: 'ДС № 1'/);
  assert.match(source, /fees: feesFromTemplate\(template\)/);
  assert.match(source, /feeDescs: feeDescsFromDefaults\(\)/);
});

test('депозит и отсрочка получают корректные начальные значения', async () => {
  const source = await readFile(financeUrl, 'utf8');

  assert.match(source, /balance, reserved: 0/);
  assert.match(source, /limit, termDays: days, debt: 0, overdue: 0/);
  assert.match(source, /if \(t === 'депозит' && !next\.deposit\)/);
  assert.match(source, /if \(t === 'отсрочка' && !next\.credit\)/);
});

test('валюта финансовых условий задаётся и видна в суммах договора', async () => {
  const source = await readFile(financeUrl, 'utf8');

  assert.match(source, /const FEE_CURRENCIES = \['USD', 'RUB', 'EUR', 'KZT'\]/);
  assert.match(source, /const cfCurrency = \(value\) => \{/);
  assert.match(source, /function fM\(n, currency = 'USD'\)/);
  assert.match(source, /const \[currency, setCurrency\] = useState\('USD'\)/);
  assert.match(source, /    const next = \{\n      settlement,\n      currency,/);
  assert.match(source, /const setCurrency = \(value\) => updateFin\(\{ \.\.\.fin, currency: value \}\)/);
  assert.match(source, /onChangeCurrency=\{setCurrency\}/);
  assert.match(source, /feeCellText\(agreement\.fees\[svc\] && agreement\.fees\[svc\]\[f\.key\], currency\)/);
  // Фиксированный сбор договора действует только в своей валюте — это видно оператору.
  assert.match(source, /Сервисный сбор подставляется в бланк автоматически, только если валюта бланка совпадает/);
});
