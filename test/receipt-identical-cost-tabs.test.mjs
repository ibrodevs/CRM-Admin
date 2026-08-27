import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile(new URL('../js/page_fulfillment.jsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
const workflowStyles = await readFile(new URL('../app/receipt-workflow.css', import.meta.url), 'utf8');

function loadGlobalCostGroups() {
  const moneyMatch = page.match(/function receiptMoneyNumber\(value\) \{[\s\S]*?\n\}/);
  assert.ok(moneyMatch, 'receiptMoneyNumber helper must exist');
  const start = page.indexOf('function receiptSupplierBaseAmount(type, receipt) {');
  const stop = page.indexOf('\nfunction receiptGroupedTickets', start);
  assert.ok(start >= 0 && stop > start, 'supplier base helpers must be contiguous');
  const source = page.slice(start, stop);
  return Function('receiptMoneyNumber', `${moneyMatch[0]}\n${source}\nreturn receiptGlobalCostGroups;`)();
}

test('identical costs are navigated through one global tab bar', () => {
  assert.match(page, /const \[costTabKey, setCostTabKey\] = useState\(''\)/);
  assert.match(page, /function ReceiptCostGroupsBar\(\{/);
  assert.match(page, /className="receipt-cost-tablist" role="tablist"/);
  assert.match(page, /<button type="button" role="tab" key=\{group\.key\}/);
  assert.match(page, /aria-selected=\{isActiveCostTab\}/);
  assert.match(page, /aria-controls=\{costPanelId\(groupIndex\)\}/);
  assert.match(page, /className="receipt-cost-panel" role="tabpanel"/);
  assert.match(page, /aria-labelledby=\{costTabId\(activeIndex\)\}/);
  // Полоса больше не строится по одному документу: нет ни пофайлового
  // состояния вкладок, ни пофайловых группировок.
  assert.doesNotMatch(page, /costTabByFile/);
  assert.doesNotMatch(page, /identicalRailPricingGroupsForFile/);
  assert.doesNotMatch(page, /rec-import-costtabs-row/);
});

test('the bar sits above the whole import table, not inside a document row', () => {
  const bar = page.indexOf('<ReceiptCostGroupsBar');
  const table = page.indexOf('<div className="table-card rec-import-table-card">');
  const rows = page.indexOf('{rows.map((r) => {', table);
  assert.ok(bar > 0 && table > bar, 'полоса рендерится до таблицы импорта');
  assert.ok(rows > table, 'строки документов остаются в таблице');
  assert.match(page, /сквозная навигация по всем загруженным бланкам/);
  assert.match(page, /groups=\{globalCostGroups\}/);
});

test('tab panel keeps viewing and editing of every blank in the price group', () => {
  assert.match(page, /activeGroup\.matches\.map\(\(match, matchIndex\) => \{/);
  assert.match(page, /const matchMath = getMath\(match\.mathKey, match\.parsed\)/);
  assert.match(page, /onClick=\{\(\) => onEditTicket\(match\)\}/);
  assert.match(page, /onClick=\{\(\) => onEditMath\(match\.mathKey\)\}/);
  assert.match(page, /onOpenBrand\(\{ fileId: match\.f\.id, blankIndex: match\.blankIndex === null \? 0 : match\.blankIndex \}\)/);
  assert.match(page, /onClick=\{\(\) => onEditGroup\(activeGroup\.sourceRow\)\}/);
  // У каждого бланка виден документ-источник — группа сквозная по всем PDF.
  assert.match(page, /<span className="receipt-cost-ticket-source">\{match\.f\.name\}<\/span>/);
  // Билет из группового PDF открывается в редакторе бланка, отдельный документ — в редакторе квитанции.
  assert.match(page, /const openCostTicketEditor = \(row\) => \{\n    if \(row\.blankIndex === null\) setEditId\(row\.f\.id\);\n    else setSubEdit\(\{ fileId: row\.f\.id, index: row\.blankIndex \}\);/);
});

test('groups cover every uploaded blank across documents and service kinds', () => {
  const receiptGlobalCostGroups = loadGlobalCostGroups();
  const row = (fileId, total, type = 'ЖД') => ({
    f: { id: fileId, type },
    mathKey: `${fileId}-${total}`,
    parsed: { currency: 'RUB', ticketCost: total, reservedSeatCost: 0, fare: total, taxes: 0 },
  });
  const groups = receiptGlobalCostGroups([
    row('group-pdf', 5261.5), row('group-pdf', 3826.1),
    row('group-pdf', '5 261,50'), row('group-pdf', '3 826,10'),
    row('separate-pdf', 5261.5),
    row('avia-pdf', 5261.5, 'Авиа'), row('avia-2-pdf', '5261.50', 'Авиа'),
    row('hotel-pdf', 5261.5, 'Гостиница'),
    row('single-pdf', 111),
  ]);

  // Одинаковая цена из разных PDF попадает в одну вкладку; виды услуг не смешиваются.
  assert.deepEqual(groups.map((group) => [group.key, group.matches.length, group.documentCount]), [
    ['ЖД::RUB::526150', 3, 2],
    ['Авиа::RUB::526150', 2, 2],
    ['ЖД::RUB::382610', 2, 1],
  ]);
  assert.equal(groups[0].amount, 5261.5);
  assert.equal(groups[0].currency, 'RUB');
  // Уникальная цена вкладку не создаёт, нетарифицируемые услуги игнорируются.
  assert.ok(!groups.some((group) => group.matches.some((match) => match.f.id === 'single-pdf')));
  assert.ok(!groups.some((group) => group.type === 'Гостиница'));
});

test('active tab survives recalculation and collapses when its price group disappears', () => {
  assert.match(page, /const activeCostTabKey = globalCostGroups\.some\(\(group\) => group\.key === costTabKey\) \? costTabKey : ''/);
  assert.match(page, /const activeIndex = groups\.findIndex\(\(group\) => group\.key === activeKey\)/);
  assert.match(page, /const activeGroup = activeIndex < 0 \? null : groups\[activeIndex\]/);
  assert.match(page, /onClick=\{\(\) => onSelect\(isActiveCostTab \? '' : group\.key\)\}/);
});

test('arrow keys move between price tabs and wrap around', () => {
  const source = page.match(/  const moveFocus = \(event, index\) => \{[\s\S]*?\n  \};/);
  assert.ok(source, 'moveFocus helper must exist');
  const calls = [];
  const focused = [];
  const moveFocus = Function('groups', 'onSelect', 'costTabId', 'document',
    `${source[0]}\nreturn moveFocus;`)(
    [{ key: 'a' }, { key: 'b' }, { key: 'c' }],
    (key) => calls.push(key),
    (index) => `cost-tab-${index}`,
    { getElementById: (id) => ({ focus: () => focused.push(id) }) },
  );
  const event = (key) => { let prevented = false; return { key, preventDefault: () => { prevented = true; }, get prevented() { return prevented; } }; };

  const right = event('ArrowRight');
  moveFocus(right, 2);
  assert.equal(right.prevented, true);
  assert.equal(calls.at(-1), 'a');
  assert.equal(focused.at(-1), 'cost-tab-0');

  moveFocus(event('ArrowLeft'), 0);
  assert.equal(calls.at(-1), 'c');
  assert.equal(focused.at(-1), 'cost-tab-2');

  const enter = event('Enter');
  moveFocus(enter, 0);
  assert.equal(enter.prevented, false);
  assert.equal(calls.length, 2);
});

test('price tabs are styled and stay readable on narrow screens', () => {
  for (const token of [
    '.receipt-cost-tabs{',
    '.receipt-cost-tablist{',
    '.receipt-cost-tab.is-active{',
    '.receipt-cost-panel{',
    '.receipt-cost-ticket{',
    '.receipt-cost-ticket-actions{',
  ]) assert.ok(styles.includes(token), `globals.css must define ${token}`);
  assert.match(styles, /@media\(max-width:900px\)\{[\s\S]*?\.receipt-cost-ticket\{grid-template-columns:26px minmax\(0,1fr\)\}/);
  assert.match(workflowStyles, /\.receipt-cost-tabs\.is-global/);
});
