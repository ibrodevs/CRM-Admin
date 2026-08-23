import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile(new URL('../js/page_fulfillment.jsx', import.meta.url), 'utf8');

function loadBrandSelector() {
  const match = page.match(/function receiptBrandFileForBlank\(file, blankIndex = 0\) \{[\s\S]*?\n\}\n\nfunction receiptHasMultipleSubReceipts/);
  assert.ok(match, 'receiptBrandFileForBlank helper must exist');
  const source = match[0].replace(/\n\nfunction receiptHasMultipleSubReceipts$/, '');
  const receiptGroupedTickets = (file) => file.subReceipts?.length
    ? file.subReceipts
    : (file.parsed?.groupTickets || []);
  const normalizeReceiptDraft = (_type, value) => value;
  return Function('receiptGroupedTickets', 'normalizeReceiptDraft', `${source}; return receiptBrandFileForBlank;`)(
    receiptGroupedTickets,
    normalizeReceiptDraft,
  );
}

test('four-page rail supplier PDF creates a branded document for only the selected ticket', () => {
  const selectBlank = loadBrandSelector();
  const tickets = [
    { passenger: 'ПЕТРИКОВ ЕВГЕНИЙ ИГОРЕВИЧ', ticketCost: 3167.30, reservedSeatCost: 2094.20, total: 5261.50 },
    { passenger: 'АЛЯЕВ АРТЕМ АЛЕКСЕЕВИЧ', ticketCost: 2217.10, reservedSeatCost: 1609.00, total: 3826.10 },
    { passenger: 'ИСАЕВ ИГОРЬ АНАТОЛЬЕВИЧ', ticketCost: 3167.30, reservedSeatCost: 2094.20, total: 5261.50 },
    { passenger: 'ЕРОФЕЕВ АНДРЕЙ ВЛАДИМИРОВИЧ', ticketCost: 2217.10, reservedSeatCost: 1609.00, total: 3826.10 },
  ];
  const grouped = {
    id: 'rail-four-pages',
    type: 'ЖД',
    parsed: {
      passenger: tickets.map((ticket) => ticket.passenger).join(', '),
      passengers: tickets.map((ticket) => ({ name: ticket.passenger })),
      ticketCost: 11768.80,
      reservedSeatCost: 8718.40,
      total: 20487.20,
      groupTickets: tickets,
      output: { mode: 'agency' },
    },
    subReceipts: tickets,
  };

  const second = selectBlank(grouped, 1);
  assert.equal(second.parsed.passenger, 'АЛЯЕВ АРТЕМ АЛЕКСЕЕВИЧ');
  assert.equal(second.parsed.ticketCost, 2217.10);
  assert.equal(second.parsed.reservedSeatCost, 1609.00);
  assert.equal(second.parsed.total, 3826.10);
  assert.equal(second.parsed.receiptCount, 1);
  assert.deepEqual(second.parsed.groupTickets, []);
  assert.deepEqual(second.subReceipts, []);
  assert.notEqual(second.parsed.total, grouped.parsed.total);
});

test('every branded-preview entry point carries the selected blank index', () => {
  assert.match(page, /onClick=\{\(\) => onBrand\(hasTicketGroup \? safeBlankIndex : null\)\}/);
  assert.match(page, /setBrandTarget\(\{ fileId: r\.f\.id, blankIndex: subIndex \}\)/);
  assert.match(page, /setBrandTarget\(\{ fileId: r\.f\.id, blankIndex: r\.blankIndex \}\)/);
  assert.match(page, /setBrandEdit\(receiptBrandFileForBlank\(d, ticketIndex\)\)/);
  assert.match(page, /setBrandEdit\(receiptBrandFileForBlank\(edit, blankIndex\)\)/);
  assert.doesNotMatch(page, /draft=\{brandFile\?\.parsed\}[\s\S]{0,250}setBrandId/);
});

