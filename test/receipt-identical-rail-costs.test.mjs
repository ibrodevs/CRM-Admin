import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile(new URL('../js/page_fulfillment.jsx', import.meta.url), 'utf8');

function costHelperSource(end) {
  const start = page.indexOf('function receiptSupplierBaseAmount(type, receipt) {');
  const stop = page.indexOf(end, start);
  assert.ok(start >= 0 && stop > start, 'supplier base helpers must be contiguous');
  return page.slice(start, stop);
}

function loadRailCostHelpers() {
  const moneyMatch = page.match(/function receiptMoneyNumber\(value\) \{[\s\S]*?\n\}/);
  assert.ok(moneyMatch, 'receiptMoneyNumber helper must exist');
  const source = costHelperSource('\nfunction receiptRailSignatureAmount');
  return Function(
    `${moneyMatch[0]}\n${source}\nreturn { receiptMoneyNumber, receiptSupplierBaseAmount, receiptRailCostSignature, receiptPricingCostSignature };`,
  )();
}

function loadRailGroupingHelper() {
  const source = costHelperSource('\nfunction receiptGroupedTickets');
  const { receiptMoneyNumber } = loadRailCostHelpers();
  return Function('receiptMoneyNumber', `${source}; return receiptGlobalCostGroups;`)(receiptMoneyNumber);
}

test('rail cost matching accepts localized values and ignores stale grouped originalTotal', () => {
  const { receiptMoneyNumber, receiptRailCostSignature } = loadRailCostHelpers();
  assert.equal(receiptMoneyNumber('5 261,50 ₽'), 5261.5);
  assert.equal(receiptMoneyNumber('5.261,50 RUB'), 5261.5);
  assert.equal(receiptMoneyNumber('5,261.50 RUB'), 5261.5);

  const first = {
    currency: 'RUB', originalTotal: '20 487,20',
    ticketCost: '3 167,30', reservedSeatCost: '2 094,20', agencyServiceFee: '0', additionalFees: '0',
  };
  const third = {
    currency: 'rub', total: '5261.50',
    ticket_cost: 3167.3, reserved_seat_cost: 2094.2, agency_service_fee: 0, additional_fees: 0,
  };
  assert.equal(receiptRailCostSignature(first), 'RUB::526150');
  assert.equal(receiptRailCostSignature(first), receiptRailCostSignature(third));
});

test('rail identical cost is the supplier base: ticket + reserved seat only', () => {
  const { receiptSupplierBaseAmount, receiptRailCostSignature } = loadRailCostHelpers();
  const base = { currency: 'RUB', ticketCost: '3 167,30', reservedSeatCost: '986,80' };

  assert.equal(receiptSupplierBaseAmount('ЖД', base), 4154.1);
  const withoutFees = receiptRailCostSignature(base);
  const withAgencyFee = receiptRailCostSignature({ ...base, agencyServiceFee: 500, additionalFees: 120 });
  const withCrmPricing = receiptRailCostSignature({ ...base, markup: 300, commission: 90, clientTotal: 4954.1 });

  assert.equal(withoutFees, 'RUB::415410');
  assert.equal(withAgencyFee, withoutFees, 'сервисный сбор агентства не влияет на закупочную базу');
  assert.equal(withCrmPricing, withoutFees, 'надбавка и комиссия CRM не влияют на закупочную базу');
});

test('avia identical cost is fare + taxes without the CRM service fee', () => {
  const { receiptSupplierBaseAmount, receiptPricingCostSignature } = loadRailCostHelpers();
  const base = { currency: 'RUB', fare: '25 328', taxes: '1 200' };

  assert.equal(receiptSupplierBaseAmount('Авиа', base), 26528);
  const plain = receiptPricingCostSignature('Авиа', base);
  assert.equal(plain, 'RUB::2652800');
  assert.equal(receiptPricingCostSignature('Авиа', { ...base, fees: 900 }), plain);
  assert.equal(receiptPricingCostSignature('Авиа', { ...base, markup: 400, commission: 100 }), plain);
  assert.equal(receiptPricingCostSignature('Гостиница', base), '', 'критерий работает только для Авиа и ЖД');
});

test('total-only blanks fall back to the supplier base without agency fees', () => {
  const { receiptSupplierBaseAmount } = loadRailCostHelpers();

  assert.equal(receiptSupplierBaseAmount('ЖД', { currency: 'RUB', total: '4 654,10', agencyServiceFee: '500' }), 4154.1);
  assert.equal(receiptSupplierBaseAmount('Авиа', { currency: 'RUB', total: '27 428', fees: 900 }), 26528);
});

test('the price bar exposes every repeated rail price from the full import list', () => {
  const groupIdentical = loadRailGroupingHelper();
  const row = (fileId, total, type = 'ЖД') => ({
    f: { id: fileId, type },
    parsed: { currency: 'RUB', ticketCost: total, reservedSeatCost: 0, fare: total, taxes: 0 },
  });
  const pricingRows = [
    row('group-pdf', 5261.5), row('group-pdf', 3826.1),
    row('group-pdf', '5 261,50'), row('group-pdf', '3 826,10'),
    row('separate-pdf', 5261.5), row('avia-pdf', 5261.5, 'Авиа'),
  ];
  // Цена из отдельного PDF попадает в ту же группу, что и билеты группового —
  // навигация сквозная по всем загруженным бланкам.
  const groups = groupIdentical(pricingRows);
  assert.deepEqual(groups.map((group) => [group.key, group.matches.length]), [
    ['ЖД::RUB::526150', 3],
    ['ЖД::RUB::382610', 2],
  ]);

  assert.match(page, /const globalCostGroups = receiptGlobalCostGroups\(pricingRows\)/);
  assert.match(page, /groups\.map\(\(group, groupIndex\) => \{/);
  assert.match(page, /<b>\{recMoney\(group\.amount, group\.currency\)\}<\/b>/);
  assert.doesNotMatch(page, /const parentPricingRow = pricingRows\.find\(\(row\) => row\.mathKey === r\.f\.id\)/);
});

test('tickets inside one grouped PDF are matched by their own supplier base', () => {
  const groupIdentical = loadRailGroupingHelper();
  const ticket = (ticketCost, reservedSeatCost, agencyServiceFee = 0) => ({
    f: { id: 'group-pdf', type: 'ЖД' },
    parsed: { currency: 'RUB', ticketCost, reservedSeatCost, agencyServiceFee, originalTotal: '20 487,20' },
  });
  const pricingRows = [
    ticket(3167.3, 986.8), ticket(3167.3, 986.8, 500),
    ticket('3 167,30', '986,80'), ticket(4602.7, 986.8),
  ];

  const groups = groupIdentical(pricingRows);

  assert.deepEqual(groups.map((group) => [group.signature, group.matches.length]), [['RUB::415410', 3]]);
});
