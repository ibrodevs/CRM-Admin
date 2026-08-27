import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile(new URL('../js/page_fulfillment.jsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../app/receipt-workflow.css', import.meta.url), 'utf8');

function loadStatusHelpers() {
  const names = ['receiptBlankFingerprint', 'receiptBlankFingerprints', 'receiptStatus'];
  const sources = names.map((name) => {
    const from = page.indexOf(`function ${name}(`);
    const to = page.indexOf('\n}', from);
    assert.ok(from >= 0 && to > from, `helper ${name} must exist`);
    return page.slice(from, to + 2);
  });
  return Function('routeSummary', `${sources.join('\n')}\nreturn { ${names.join(', ')} };`)(
    (parsed) => {
      const leg = parsed?.legs?.[0] || {};
      return [leg.from, leg.to].filter(Boolean).join(' → ') || '—';
    },
  );
}

const railTicket = (passenger, ticketNo, seat) => ({
  passenger,
  ticketNo,
  total: 5052,
  legs: [{ from: 'САНКТ-ПЕТЕРБУРГ-ГЛАВНЫЙ', to: 'МОСКВА ОКТЯБРЬСКАЯ', date: '15.03.2025', flightNo: '021АА', coach: '13', seat }],
});

const railFile = (passenger, tickets) => ({
  passenger,
  ticketNo: tickets[0]?.ticketNo,
  total: tickets.reduce((sum, ticket) => sum + ticket.total, 0),
  legs: tickets[0].legs,
  groupTickets: tickets,
});

test('tickets of one rail order are not mistaken for duplicates', () => {
  const { receiptStatus } = loadStatusHelpers();
  const seen = new Set();
  // Перевозчик печатает общий номер заказа на каждом билете группы.
  const order = '71234567890123';
  const first = railFile('МАСЛЮКОВ', [railTicket('МАСЛЮКОВ', order, '005'), railTicket('ИВАНОВ', order, '006')]);
  const second = railFile('ФАХРУТДИНОВ', [railTicket('ФАХРУТДИНОВ', order, '033'), railTicket('ПЕТРОВ', order, '034')]);
  const third = railFile('ШАРПАНОВ', [railTicket('ШАРПАНОВ', order, '041')]);

  assert.notEqual(receiptStatus(first, seen, 'ЖД', null), 'Возможный дубль');
  assert.notEqual(receiptStatus(second, seen, 'ЖД', null), 'Возможный дубль');
  assert.notEqual(receiptStatus(third, seen, 'ЖД', null), 'Возможный дубль');
});

test('the same file uploaded twice is still flagged', () => {
  const { receiptStatus } = loadStatusHelpers();
  const seen = new Set();
  const file = railFile('МАСЛЮКОВ', [railTicket('МАСЛЮКОВ', '71234567890123', '005')]);
  assert.notEqual(receiptStatus(file, seen, 'ЖД', null), 'Возможный дубль');
  assert.equal(receiptStatus(file, seen, 'ЖД', null), 'Возможный дубль');
});

test('a partial overlap of blanks is not a duplicate', () => {
  const { receiptStatus } = loadStatusHelpers();
  const seen = new Set();
  const shared = railTicket('МАСЛЮКОВ', '71234567890123', '005');
  const first = railFile('МАСЛЮКОВ', [shared, railTicket('ИВАНОВ', '71234567890123', '006')]);
  const second = railFile('МАСЛЮКОВ', [shared, railTicket('СИДОРОВ', '71234567890123', '007')]);
  assert.notEqual(receiptStatus(first, seen, 'ЖД', null), 'Возможный дубль');
  assert.notEqual(receiptStatus(second, seen, 'ЖД', null), 'Возможный дубль');
});

test('a blank without a number is still separated by passenger and seat', () => {
  const { receiptBlankFingerprint } = loadStatusHelpers();
  const a = receiptBlankFingerprint(railTicket('АХУНОВ ТИМУР', '', '005'), {});
  const b = receiptBlankFingerprint(railTicket('БАЛДАЕВ ДАНИИЛ', '', '005'), {});
  assert.ok(a && b);
  assert.notEqual(a, b);
  // Пустой бланк отпечатка не даёт и в подсчёт дублей не попадает.
  assert.equal(receiptBlankFingerprint({}, {}), '');
});

test('editing a blank marks it reviewed so the next step unlocks', () => {
  // Правка снимает «ожидает распознавания» с самого бланка.
  assert.match(page, /const editedChild = normalizeReceiptDraft\(sourceFile\?\.type \|\| 'ЖД', \{\n\s+\.\.\.parsed,\n\s+recognitionPending: false,/);
  // «Проверено» в редакторе отдельного билета помечает именно его.
  assert.match(page, /updateSubReceipt\(subEdit\.fileId, subEdit\.index, \{\n\s+\.\.\.parsed,\n\s+reviewStatus: 'reviewed', review_status: 'reviewed', reviewed: true,/);
  // Экспресс-проверка держит императивный снимок файлов в актуальном виде.
  assert.match(page, /filesStateRef\.current = filesStateRef\.current\.map\(\(file\) => \{\n\s+if \(!readyIds\.has\(file\.id\)\) return file;/);
});

test('the last step explains what blocks adding to the order and offers a fix', () => {
  assert.match(page, /const blockingRows = doneRows\.filter\(/);
  assert.match(page, /const pendingReview = blockingRows\.length;/);
  // Блок живёт только на шаге «В заказ»: между шагами оператор ходит свободно.
  assert.match(page, /Нельзя добавить в заказ: не подтверждено/);
  assert.doesNotMatch(page, /Переход дальше заблокирован/);
  assert.match(page, /\{step === 4 && <>[\s\S]*receipt-next-blocked/);
  assert.match(page, /Редактирование бланка проверкой не считается/);
  assert.match(page, /onClick=\{reviewAllReadyReceipts\}>Подтвердить все готовые/);
  assert.match(page, /onClick=\{\(\) => setEditId\(blockingDetails\[0\]\.id\)\}>Открыть первый документ/);
  assert.match(styles, /\.receipt-next-blocked \{/);
});
