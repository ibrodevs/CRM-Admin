import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile(new URL('../js/page_fulfillment.jsx', import.meta.url), 'utf8');

function loadRailCostHelpers() {
  const moneyMatch = page.match(/function receiptMoneyNumber\(value\) \{[\s\S]*?\n\}/);
  const signatureMatch = page.match(/function receiptRailCostSignature\(ticket\) \{[\s\S]*?\n\}/);
  assert.ok(moneyMatch, 'receiptMoneyNumber helper must exist');
  assert.ok(signatureMatch, 'receiptRailCostSignature helper must exist');
  return Function(`${moneyMatch[0]}\n${signatureMatch[0]}\nreturn { receiptMoneyNumber, receiptRailCostSignature };`)();
}

function loadRailGroupingHelper() {
  const signatureStart = page.indexOf('function receiptRailCostSignature(ticket) {');
  const groupingEnd = page.indexOf('\n\nfunction receiptGroupedTickets', signatureStart);
  assert.ok(signatureStart >= 0 && groupingEnd > signatureStart, 'rail pricing helpers must be contiguous');
  const source = page.slice(signatureStart, groupingEnd);
  const { receiptMoneyNumber } = loadRailCostHelpers();
  return Function('receiptMoneyNumber', `${source}; return receiptIdenticalRailPricingGroups;`)(receiptMoneyNumber);
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

test('collapsed group row exposes every repeated rail price from the full import list', () => {
  const groupIdentical = loadRailGroupingHelper();
  const row = (fileId, total, type = 'ЖД') => ({
    f: { id: fileId, type },
    parsed: { currency: 'RUB', ticketCost: total, reservedSeatCost: 0 },
  });
  const pricingRows = [
    row('group-pdf', 5261.5), row('group-pdf', 3826.1),
    row('group-pdf', '5 261,50'), row('group-pdf', '3 826,10'),
    row('separate-pdf', 5261.5), row('avia-pdf', 5261.5, 'Авиа'),
  ];
  const groups = groupIdentical(pricingRows, 'group-pdf');
  assert.deepEqual(groups.map((group) => [group.signature, group.matches.length]), [
    ['RUB::526150', 3],
    ['RUB::382610', 2],
  ]);

  assert.match(page, /const identicalRailPricingGroupsForFile = \(file\) =>/);
  assert.match(page, /receiptIdenticalRailPricingGroups\(pricingRows, file\.id\)/);
  assert.match(page, /sameRailGroups\.map\(\(group, groupIndex\) => \{/);
  assert.match(page, /<b>\{recMoney\(receiptRailSignatureAmount\(group\.signature\), group\.sourceRow\.parsed\.currency\)\}<\/b>/);
  assert.doesNotMatch(page, /const parentPricingRow = pricingRows\.find\(\(row\) => row\.mathKey === r\.f\.id\)/);
});
