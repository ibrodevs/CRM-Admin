import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile(new URL('../js/page_fulfillment.jsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');

function loadHelper(name, deps) {
  const start = page.indexOf(`  const ${name} = (`);
  const end = page.indexOf('\n  };', start);
  assert.ok(start >= 0 && end > start, `helper ${name} must exist`);
  const source = page.slice(start, end + 5);
  const params = Object.keys(deps);
  return Function(...params, `${source}\nreturn ${name};`)(...params.map((key) => deps[key]));
}

test('identical costs are navigated through tabs instead of stacked buttons', () => {
  assert.match(page, /const \[costTabByFile, setCostTabByFile\] = useState\(\{\}\)/);
  assert.match(page, /className="receipt-cost-tablist" role="tablist"/);
  assert.match(page, /<button type="button" role="tab" key=\{group\.signature\}/);
  assert.match(page, /aria-selected=\{isActiveCostTab\}/);
  assert.match(page, /aria-controls=\{costPanelId\(r\.f\.id, groupIndex\)\}/);
  assert.match(page, /className="receipt-cost-panel" role="tabpanel"/);
  assert.match(page, /aria-labelledby=\{costTabId\(r\.f\.id, activeCostIndex\)\}/);
  // Колонка операций больше не повторяет по кнопке на каждую группу цены.
  assert.doesNotMatch(page, /Одинаковая стоимость \{recMoney\(receiptRailSignatureAmount\(group\.signature\)/);
});

test('tab panel keeps viewing and editing of every blank in the price group', () => {
  assert.match(page, /activeCostGroup\.matches\.map\(\(match, matchIndex\) => \{/);
  assert.match(page, /const matchMath = getMath\(match\.mathKey, match\.parsed\)/);
  assert.match(page, /onClick=\{\(\) => openCostTicketEditor\(match\)\}/);
  assert.match(page, /onClick=\{\(\) => setMathId\(match\.mathKey\)\}/);
  assert.match(page, /setBrandTarget\(\{ fileId: match\.f\.id, blankIndex: match\.blankIndex === null \? 0 : match\.blankIndex \}\)/);
  assert.match(page, /onClick=\{\(\) => selectIdenticalRailPricing\(activeCostGroup\.sourceRow\)\}/);
  // Билет из группового PDF открывается в редакторе бланка, отдельный документ — в редакторе квитанции.
  assert.match(page, /const openCostTicketEditor = \(row\) => \{\n    if \(row\.blankIndex === null\) setEditId\(row\.f\.id\);\n    else setSubEdit\(\{ fileId: row\.f\.id, index: row\.blankIndex \}\);/);
});

test('active tab survives recalculation and collapses when its price group disappears', () => {
  const groups = [{ signature: 'RUB::415410' }, { signature: 'RUB::558950' }];
  const withState = (state) => loadHelper('activeCostTabGroup', { costTabByFile: state });

  assert.equal(withState({})('file-1', groups), null);
  assert.equal(withState({ 'file-1': '' })('file-1', groups), null);
  assert.deepEqual(withState({ 'file-1': 'RUB::558950' })('file-1', groups), { signature: 'RUB::558950', index: 1 });
  // Стоимость поменяли — старой вкладки больше нет, панель сворачивается, а не падает.
  assert.equal(withState({ 'file-1': 'RUB::999999' })('file-1', groups), null);
  assert.equal(withState({ 'file-1': 'RUB::415410' })('file-2', groups), null);
});

test('arrow keys move between price tabs and wrap around', () => {
  const groups = [{ signature: 'a' }, { signature: 'b' }, { signature: 'c' }];
  const calls = [];
  const focused = [];
  const moveCostTabFocus = loadHelper('moveCostTabFocus', {
    setCostTab: (fileId, signature) => calls.push([fileId, signature]),
    costTabId: (fileId, index) => `cost-tab-${fileId}-${index}`,
    document: { getElementById: (id) => ({ focus: () => focused.push(id) }) },
  });
  const event = (key) => { let prevented = false; return { key, preventDefault: () => { prevented = true; }, get prevented() { return prevented; } }; };

  const right = event('ArrowRight');
  moveCostTabFocus(right, 'file-1', groups, 2);
  assert.equal(right.prevented, true);
  assert.deepEqual(calls.at(-1), ['file-1', 'a']);
  assert.equal(focused.at(-1), 'cost-tab-file-1-0');

  moveCostTabFocus(event('ArrowLeft'), 'file-1', groups, 0);
  assert.deepEqual(calls.at(-1), ['file-1', 'c']);
  assert.equal(focused.at(-1), 'cost-tab-file-1-2');

  const enter = event('Enter');
  moveCostTabFocus(enter, 'file-1', groups, 0);
  assert.equal(enter.prevented, false);
  assert.equal(calls.length, 2);
  moveCostTabFocus(event('ArrowRight'), 'file-1', [{ signature: 'a' }], 0);
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
});

test('the price tabs band sits above its document row', () => {
  const band = page.indexOf("{sameRailGroups.length > 0 && (");
  const row = page.indexOf("<tr className={'rec-import-row' + (r.f.subReceipts?.length ? ' has-subrows' : '')}");
  const subrows = page.indexOf('{expandedReceipts[r.f.id] && (r.f.subReceipts || []).map(');
  assert.ok(band > 0 && row > band, 'вкладки рендерятся до строки документа');
  assert.ok(subrows > row, 'бланки документа остаются под ним');
  // Полоса не прилипает к строке документа и к колонке операций.
  assert.match(styles, /\.rec-import-costtabs-row\{display:block;padding:16px 18px 2px/);
  assert.match(styles, /\.rec-import-costtabs-row \+ tr\.rec-import-row\{padding-top:14px\}/);
  assert.match(styles, /td\[data-label="Операции"\] \.rec-import-actions\{padding:6px 0\}/);
});
