import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile(new URL('../js/page_fulfillment.jsx', import.meta.url), 'utf8');
const resources = await readFile(new URL('../js/api/resources.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');

function loadConstant(name) {
  const from = page.indexOf(`const ${name} = {`);
  const to = page.indexOf('\n};', from);
  assert.ok(from >= 0 && to > from, `constant ${name} must exist`);
  return page.slice(from, to + 3);
}

function loadFunctions(names, constants = []) {
  const prelude = constants.map(loadConstant);
  const sources = names.map((name) => {
    const from = page.indexOf(`function ${name}(`);
    const to = page.indexOf('\n}', from);
    assert.ok(from >= 0 && to > from, `module helper ${name} must exist`);
    return page.slice(from, to + 2);
  });
  return Function(`${[...prelude, ...sources].join('\n')}\nreturn { ${names.join(', ')} };`)();
}

function loadComponentHelper(name, deps) {
  const start = page.indexOf(`  const ${name} = (`);
  const end = page.indexOf('\n  };', start);
  assert.ok(start >= 0 && end > start, `component helper ${name} must exist`);
  const source = page.slice(start, end + 5);
  const params = Object.keys(deps);
  return Function(...params, `${source}\nreturn ${name};`)(...params.map((key) => deps[key]));
}

const getMathFrom = (state, id, parsed) => state[id] || {
  tariff: Number(parsed?.fare || 0) + Number(parsed?.taxes || 0),
  fee: Number(parsed?.fees || 0),
  markup: 0,
  commission: 0,
};

function feeHarness(initialMath = {}) {
  const calls = { synced: [], toasts: [] };
  const mathStateRef = { current: { ...initialMath } };
  const serviceFeeInfoRef = { current: {} };
  const { normalizeServiceFeeResolution } = loadFunctions(['normalizeServiceFeeResolution']);
  const applyServiceFeeMath = loadComponentHelper('applyServiceFeeMath', {
    mathStateRef,
    getMathFrom,
    setMath: (next) => { calls.math = next; },
    syncPricingSnapshots: (next, ids, options) => calls.synced.push({ ids, options }),
  });
  const announceServiceFeeSource = loadComponentHelper('announceServiceFeeSource', {
    toast: (message, tone) => calls.toasts.push([message, tone]),
    plural: (n, forms) => forms[2],
  });
  const applyServiceFeeResolutions = loadComponentHelper('applyServiceFeeResolutions', {
    serviceFeeInfoRef,
    normalizeServiceFeeResolution,
    setServiceFeeInfo: (next) => { calls.info = next; },
    applyServiceFeeMath,
    announceServiceFeeSource,
  });
  return { applyServiceFeeResolutions, mathStateRef, serviceFeeInfoRef, calls };
}

const railRow = (key, base) => ({
  mathKey: key,
  f: { id: key.split('::')[0], type: 'ЖД' },
  parsed: { currency: 'RUB', fare: base, taxes: 0, fees: 0 },
});

test('fixed contract fee from the backend lands in the internal math of every blank', () => {
  const rows = [railRow('doc-1::blank::0', 4154.1), railRow('doc-1::blank::1', 5589.5)];
  const harness = feeHarness();

  harness.applyServiceFeeResolutions(rows, rows.map((row) => ({
    key: row.mathKey, source: 'contract', fee: '500.00', currency: 'RUB',
    calculation: 'fixed', value: '500.0000', rule_id: 'r-1', contract_id: 'c-1',
    agreement_id: 'a-1', contract_number: '№ 123', agreement_number: 'ДС № 1',
  })));

  assert.equal(harness.mathStateRef.current['doc-1::blank::0'].fee, 500);
  assert.equal(harness.mathStateRef.current['doc-1::blank::1'].fee, 500);
  assert.equal(harness.serviceFeeInfoRef.current['doc-1::blank::0'].source, 'contract');
  assert.equal(harness.serviceFeeInfoRef.current['doc-1::blank::0'].contractNumber, '№ 123');
  assert.equal(harness.calls.synced.length, 1, 'рабочие PDF пересобираются один раз на пакет');
  assert.deepEqual(harness.calls.synced[0].ids, ['doc-1']);
});

test('percent contract fee keeps its own amount for every supplier base', () => {
  const rows = [railRow('doc-1::blank::0', 10000), railRow('doc-1::blank::1', 20000)];
  const harness = feeHarness();

  harness.applyServiceFeeResolutions(rows, [
    { key: rows[0].mathKey, source: 'contract', fee: '1000.00', calculation: 'percent', value: '10.0000', currency: 'RUB' },
    { key: rows[1].mathKey, source: 'contract', fee: '2000.00', calculation: 'percent', value: '10.0000', currency: 'RUB' },
  ]);

  assert.equal(harness.mathStateRef.current['doc-1::blank::0'].fee, 1000);
  assert.equal(harness.mathStateRef.current['doc-1::blank::1'].fee, 2000);
});

test('no contract rule keeps the fee manual instead of silently zeroing it', () => {
  const rows = [railRow('doc-1', 4154.1)];
  const harness = feeHarness({ 'doc-1': { tariff: 4154.1, fee: 700, markup: 0, commission: 0 } });

  harness.applyServiceFeeResolutions(rows, [
    { key: 'doc-1', source: 'manual', fee: null, reason: 'no_applicable_rule', currency: 'RUB' },
  ]);

  assert.equal(harness.mathStateRef.current['doc-1'].fee, 700, 'ручная сумма оператора остаётся');
  assert.equal(harness.serviceFeeInfoRef.current['doc-1'].source, 'manual');
  assert.equal(harness.serviceFeeInfoRef.current['doc-1'].reason, 'no_applicable_rule');
  assert.equal(harness.serviceFeeInfoRef.current['doc-1'].fee, null);
  assert.equal(harness.calls.synced.length, 0, 'без договорного сбора математика не переписывается');
});

test('switching a person to a company pulls the contract fee in, and back to manual on reverse', () => {
  const rows = [railRow('doc-1', 4154.1)];
  const harness = feeHarness({ 'doc-1': { tariff: 4154.1, fee: 300, markup: 0, commission: 0 } });

  harness.applyServiceFeeResolutions(rows, [
    { key: 'doc-1', source: 'manual', fee: null, reason: 'no_company', currency: 'RUB' },
  ]);
  assert.equal(harness.mathStateRef.current['doc-1'].fee, 300);

  harness.applyServiceFeeResolutions(rows, [
    { key: 'doc-1', source: 'contract', fee: '500.00', calculation: 'fixed', contract_number: '№ 123', currency: 'RUB' },
  ]);
  assert.equal(harness.mathStateRef.current['doc-1'].fee, 500, 'ручной сбор заменяется договорным');
  assert.equal(harness.serviceFeeInfoRef.current['doc-1'].source, 'contract');

  harness.applyServiceFeeResolutions(rows, [
    { key: 'doc-1', source: 'manual', fee: null, reason: 'no_company', currency: 'RUB' },
  ]);
  assert.equal(harness.serviceFeeInfoRef.current['doc-1'].source, 'manual');
  assert.equal(harness.serviceFeeInfoRef.current['doc-1'].reason, 'no_company');
  // Смена клиента не должна проходить незаметно.
  assert.ok(harness.calls.toasts.some(([message]) => /Клиент изменён/.test(message)));
  assert.ok(harness.calls.toasts.some(([message]) => /по договору № 123/.test(message)));
});

test('binding target decides which counterparty the backend resolves the fee for', () => {
  const { receiptFeeBindingContext } = loadFunctions(['receiptFeeBindingContext']);

  assert.deepEqual(
    receiptFeeBindingContext({ mode: 'company', company: { id: 'c-1', name: 'ООО ABC' } }),
    { company: 'c-1', label: 'ООО ABC' },
  );
  assert.deepEqual(
    receiptFeeBindingContext({ mode: 'order', order: { id: 'o-1', no: '2026-14' } }),
    { order: 'o-1', label: 'Заказ № 2026-14' },
  );
  assert.deepEqual(
    receiptFeeBindingContext({ mode: 'person', client: 'Иванов И.' }),
    { reason: 'no_company', label: 'Физлицо' },
  );
  assert.deepEqual(
    receiptFeeBindingContext({ mode: 'new', label: 'Новый заказ' }),
    { reason: 'no_company', label: 'Клиент не выбран' },
  );
});

test('operator always sees where the service fee came from', () => {
  const { serviceFeeSourceLabel, serviceFeeManualHint } = loadFunctions(
    ['serviceFeeSourceLabel', 'serviceFeeManualHint'],
    ['SERVICE_FEE_MANUAL_HINTS'],
  );

  assert.equal(
    serviceFeeSourceLabel({ source: 'contract', contractNumber: '№ 123', calculation: 'fixed' }),
    'Автоматически по договору № 123',
  );
  assert.equal(
    serviceFeeSourceLabel({ source: 'contract', contractNumber: '', calculation: 'percent', value: '5' }),
    'По условиям контрагента · 5% от базы поставщика',
  );
  assert.equal(serviceFeeSourceLabel({ source: 'manual' }), '');
  assert.equal(
    serviceFeeManualHint({ source: 'manual', reason: 'no_company' }),
    'Условия по договору не найдены — укажите вручную',
  );
  assert.match(serviceFeeManualHint({ source: 'manual', reason: 'no_applicable_rule' }), /нет правила сервисного сбора/);
  assert.match(
    serviceFeeManualHint({ source: 'manual', reason: 'currency_mismatch', contractFee: '20.00', contractCurrency: 'USD', contractNumber: '№ 123' }),
    /USD/,
  );
  assert.equal(serviceFeeManualHint({ source: 'contract' }), '');
});

test('the service fee is calculated by the backend, not by the import wizard', () => {
  assert.match(resources, /resolveServiceFee: \(body, signal\) => create\('service-fee\/resolve\/', body/);
  assert.match(page, /crmApi\.resolveServiceFee\(\{[\s\S]*company: feeBindingContext\.company \|\| null,[\s\S]*order: feeBindingContext\.order \|\| null,[\s\S]*items,/);
  assert.match(page, /base_amount: serviceFeeBase\(row\)/);
  // База сбора — база поставщика из математики, а не итог с самим сбором.
  assert.match(page, /const serviceFeeBase = \(row\) => Math\.round\(\(Number\(getMathFrom\(math, row\.mathKey, row\.parsed\)\.tariff\)/);
  assert.match(page, /\}, \[open, feeBindingSignature, feeRowsSignature\]\)/);
  // Сумма берётся из ответа сервера как есть — фронт не считает правило сам.
  assert.match(page, /fee: source === 'contract' && Number\.isFinite\(fee\) \? Math\.round\(fee \* 100\) \/ 100 : null/);
  assert.doesNotMatch(page, /base_amount \* |rule\.value/);
});

test('math drawer locks the contract fee and explains a manual one', () => {
  assert.match(page, /const contractFee = feeInfo\?\.source === 'contract' && feeInfo\.fee !== null/);
  assert.match(page, /const feeAmount = contractFee \? num\(feeInfo\.fee\) : num\(m\.fee\)/);
  assert.match(page, /const client = num\(num\(m\.tariff\) \+ feeAmount \+ num\(m\.markup\)\)/);
  assert.match(page, /<input className="input" value=\{feeAmount\} readOnly disabled aria-readonly="true" \/>/);
  assert.match(page, /\{serviceFeeSourceLabel\(feeInfo\)\}/);
  assert.match(page, /\{serviceFeeManualHint\(feeInfo\)\}/);
  assert.match(page, /Выбрано \$\{targetRows\.length\}/);
  assert.ok(styles.includes('.receipt-internal-math-note.is-contract{color:var(--green)}'));
});

test('mass pricing keeps every blank on its own contract fee', () => {
  assert.match(page, /const contractServiceFeeFor = \(mathKey\) => \{/);
  assert.match(page, /\.\.\.\(contractFee === null \? \{\} : \{ fee: contractFee \}\)/);
  assert.match(page, /fee: contractFee === null\n\s+\? Math\.round\(\(Number\(receipt\?\.fees\) \|\| 0\) \* 100\) \/ 100\n\s+: contractFee/);
});

test('confirmation sends the fee source for a server-side re-check', () => {
  assert.match(page, /service_fee: receiptServiceFeePayload\(r\.f, m\)/);
  assert.match(page, /const isContract = infos\.length > 0 && contractInfos\.length === infos\.length/);
  assert.match(page, /source: isContract \? 'contract' : 'manual'/);
  assert.match(page, /rule_id: isContract \? \(reference\?\.ruleId \|\| ''\) : ''/);
  // Черновик импорта помнит источник сбора вместе с математикой.
  assert.match(page, /      math,\n      serviceFeeInfo,/);
  assert.match(page, /setServiceFeeInfo\(draft\?\.serviceFeeInfo \|\| \{\}\)/);
});

test('bulk pricing never starts on its own — the operator must pass explicit targets', () => {
  const rows = [
    { mathKey: 'doc-1::blank::0', f: { id: 'doc-1', type: 'ЖД' }, parsed: { fare: 4154.1, taxes: 0, fees: 0, passenger: 'ПЕРВЫЙ' } },
    { mathKey: 'doc-1::blank::1', f: { id: 'doc-1', type: 'ЖД' }, parsed: { fare: 4154.1, taxes: 0, fees: 0, passenger: 'ВТОРОЙ' } },
  ];
  const state = { current: {} };
  const setMathFor = loadComponentHelper('setMathFor', {
    mathStateRef: state,
    pricingRows: rows,
    pricingSel: { 'doc-1::blank::0': true, 'doc-1::blank::1': true },
    getMathFrom,
    setMath: () => {},
    syncPricingSnapshots: () => {},
    contractServiceFeeFor: () => null,
    toast: () => {},
  });

  // Галочки в таблице сами по себе массовое применение не запускают.
  setMathFor('doc-1::blank::0', rows[0].parsed, { tariff: 4200, fee: 500, markup: 100, commission: 50 });

  assert.deepEqual(state.current['doc-1::blank::0'], { tariff: 4200, fee: 500, markup: 100, commission: 50 });
  assert.equal(state.current['doc-1::blank::1'], undefined, 'без явного подтверждения соседний бланк не трогается');
});

test('bulk pricing shares only fee, markup and commission — never the blank data', () => {
  const rows = [
    { mathKey: 'doc-1::blank::0', f: { id: 'doc-1', type: 'ЖД' }, parsed: { fare: 4154.1, taxes: 0, fees: 0, passenger: 'ПЕРВЫЙ', ticketNo: '111' } },
    { mathKey: 'doc-1::blank::1', f: { id: 'doc-1', type: 'ЖД' }, parsed: { fare: 4154.1, taxes: 0, fees: 0, passenger: 'ВТОРОЙ', ticketNo: '222' } },
    { mathKey: 'doc-2', f: { id: 'doc-2', type: 'ЖД' }, parsed: { fare: 5589.5, taxes: 0, fees: 0, passenger: 'ТРЕТИЙ', ticketNo: '333' } },
    { mathKey: 'avia-1', f: { id: 'avia-1', type: 'Авиа' }, parsed: { fare: 4154.1, taxes: 0, fees: 0, passenger: 'АВИА' } },
  ];
  const contractFees = { 'doc-2': 750 };
  const state = { current: {} };
  const setMathFor = loadComponentHelper('setMathFor', {
    mathStateRef: state,
    pricingRows: rows,
    pricingSel: { 'doc-1::blank::0': true, 'doc-1::blank::1': true, 'doc-2': true, 'avia-1': true },
    getMathFrom,
    setMath: () => {},
    syncPricingSnapshots: () => {},
    contractServiceFeeFor: (key) => (contractFees[key] === undefined ? null : contractFees[key]),
    toast: () => {},
  });

  // Явный список бланков приходит из формы расчёта после подтверждения.
  setMathFor('doc-1::blank::0', rows[0].parsed, { tariff: 4200, fee: 500, markup: 100, commission: 50 }, rows);

  const math = state.current;
  // Общими стали только сбор, надбавка и комиссия — внутри одного вида услуги.
  assert.deepEqual(math['doc-1::blank::0'], { tariff: 4200, fee: 500, markup: 100, commission: 50 });
  assert.equal(math['doc-1::blank::1'].tariff, 4154.1, 'база поставщика соседнего бланка не тронута');
  assert.equal(math['doc-1::blank::1'].fee, 500);
  assert.equal(math['doc-2'].tariff, 5589.5);
  assert.equal(math['doc-2'].fee, 750, 'договорной сбор бланка не заменяется сбором исходного билета');
  assert.equal(math['avia-1'], undefined, 'другой вид услуги в массовое применение не попадает');
  // Данные самих бланков живут в parsed и математикой не переписываются.
  assert.equal(rows[1].parsed.passenger, 'ВТОРОЙ');
  assert.equal(rows[1].parsed.ticketNo, '222');
  assert.equal(rows[2].parsed.fare, 5589.5);
});

test('the removed bulk math card must not come back', () => {
  assert.doesNotMatch(page, /Применить ко всем|ко всем проверенным|Массовая математика/);
  assert.doesNotMatch(page, /Математика: применить/);
  // Расчёт живёт в отдельной форме конкретного бланка или группы одинаковой стоимости.
  assert.match(page, /Внутренняя математика · /);
  assert.match(page, /Редактировать одинаковую стоимость \(\{identicalCostCount\}\)/);
});

test('saving waits for a pending fee calculation and uses the freshest math', () => {
  assert.match(page, /const ensureServiceFeesResolved = async \(\) => \{/);
  assert.match(page, /await ensureServiceFeesResolved\(\);/);
  assert.match(page, /serviceFeeResolveRef\.current = pending;/);
  assert.match(page, /\.finally\(release\)/);
  assert.match(page, /const m = mathForFileWithState\(r\.f, mathStateRef\.current\)/);
});

test('service fee notification is dismissible with close button and has vertical spacing', () => {
  assert.match(page, /function ServiceFeeBindingSummary\(\{[\s\S]*?dismissed = false[\s\S]*?onDismiss = null[\s\S]*?\}\)/);
  assert.match(page, /className="receipt-fee-summary-close"/);
  assert.match(page, /aria-label="Закрыть уведомление"/);
  assert.match(page, /<Icon name="x" \/>/);
  assert.match(styles, /\.receipt-fee-summary\{[^}]*margin:12px 0 14px/);
  assert.match(styles, /\.receipt-fee-summary-close\{/);
});
