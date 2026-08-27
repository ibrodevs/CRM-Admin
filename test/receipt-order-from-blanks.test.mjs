import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile(new URL('../js/page_fulfillment.jsx', import.meta.url), 'utf8');
const app = await readFile(new URL('../js/app.jsx', import.meta.url), 'utf8');
const workspace = await readFile(new URL('../js/core/workspace-context.jsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../app/receipt-workflow.css', import.meta.url), 'utf8');

function loadPlanHelpers() {
  const names = [
    'receiptIsoDate', 'receiptRoutePointCode', 'receiptRoutePointName',
    'receiptOrderPassengers', 'receiptRouteContains', 'receiptMergeRoutes',
    'receiptOrderPlan', 'receiptPersonNameParts',
  ];
  const sources = names.map((name) => {
    const from = page.indexOf(`function ${name}(`);
    const to = page.indexOf('\n}', from);
    assert.ok(from >= 0 && to > from, `helper ${name} must exist`);
    return page.slice(from, to + 2);
  });
  return Function('receiptGroupedTickets', 'normalizeReceiptDraft',
    `${sources.join('\n')}\nreturn { ${names.join(', ')} };`)(
    (file) => (file?.subReceipts?.length ? file.subReceipts : (file?.parsed?.groupTickets || [])),
    (_type, value) => value,
  );
}

test('creating an order from receipts never routes the operator into a service search', () => {
  assert.match(page, /function ReceiptOrderCreateDrawer\(/);
  assert.match(page, /Создание заказа по бланкам/);
  assert.match(page, /Всё уже есть в маршрут-квитанциях/);
  assert.match(page, /Поиск услуг в этом сценарии не нужен/);
  assert.match(page, /const createdOrder = await requestOrderFromReceipts\(receiptOrderPlan\(/);
  // Общая форма поиска услуг в потоке квитанций больше не участвует.
  assert.doesNotMatch(app, /OrderCreateModal/);
  assert.doesNotMatch(page, /Найти услуги/);
  assert.match(styles, /\.receipt-order-plan/);
});

test('the drawer offers a new individual, an existing client or a company', () => {
  assert.match(page, /const \[clientMode, setClientMode\] = useState\('new'\)/);
  assert.match(page, /\['new', 'Новое физлицо'/);
  assert.match(page, /\['existing', 'Существующий клиент'/);
  assert.match(page, /\['company', 'Юридическое лицо'/);
  // Новое физлицо предзаполняется пассажиром из бланка.
  assert.match(page, /const parts = receiptPersonNameParts\(firstPassenger\?\.name\)/);
  assert.match(page, /Укажите фамилию нового физлица/);
});

test('the application creates the person, the order, its route and participants', () => {
  assert.match(app, /const createReceiptOrder = async \(draft\) =>/);
  assert.match(app, /await workspace\.createPersonClient\(/);
  assert.match(app, /route: plan\.points\?\.length >= 2 \? \{ kind: plan\.kind, points: plan\.points \} : null/);
  assert.match(app, /participants: \(draft\.passengers \|\| \[\]\)\.map\(/);
  assert.match(app, /guest_snapshot: \{/);
  // Маршрут доходит до backend вместе с заказом.
  assert.match(workspace, /if \(draft\.route && Array\.isArray\(draft\.route\.points\) && draft\.route\.points\.length >= 2\)/);
});

test('the plan is built from the blanks: passengers, route, dates and service kinds', () => {
  const { receiptOrderPlan, receiptIsoDate, receiptRoutePointCode, receiptPersonNameParts } = loadPlanHelpers();

  assert.equal(receiptIsoDate('05.02.2026'), '2026-02-05');
  assert.equal(receiptIsoDate('2026-02-05'), '2026-02-05');
  assert.equal(receiptIsoDate('не распознано'), '');
  assert.equal(receiptRoutePointCode({ fromCode: 'SVO' }, 'from'), 'SVO');
  assert.equal(receiptRoutePointCode({ to: 'Дубай (DXB)' }, 'to'), 'DXB');
  assert.equal(receiptRoutePointCode({ to: 'Санкт-Петербург-Главный' }, 'to'), 'САНКТПЕТ');
  assert.deepEqual(receiptPersonNameParts('ИВАНОВ ИВАН ИВАНОВИЧ'),
    { surname: 'ИВАНОВ', givenName: 'ИВАН', middleName: 'ИВАНОВИЧ' });

  const plan = receiptOrderPlan([
    {
      type: 'Авиа',
      parsed: {
        currency: 'RUB', tripType: 'roundtrip',
        passengers: [{ name: 'ИВАНОВ ИВАН', dob: '01.01.1990', document: '1234', ticketNo: '555' }],
        legs: [
          { fromCode: 'SVO', from: 'Москва', toCode: 'DXB', to: 'Дубай', date: '10.03.2026' },
          { fromCode: 'DXB', from: 'Дубай', toCode: 'SVO', to: 'Москва', date: '20.03.2026' },
        ],
      },
    },
    {
      type: 'Авиа',
      parsed: {
        currency: 'RUB',
        passengers: [{ name: 'ИВАНОВ ИВАН', dob: '01.01.1990' }, { name: 'ПЕТРОВ ПЁТР', dob: '02.02.1985' }],
        legs: [{ fromCode: 'SVO', from: 'Москва', toCode: 'DXB', to: 'Дубай', date: '10.03.2026' }],
      },
    },
  ]);

  // Пассажиры не дублируются, а маршрут второго бланка вложен в первый и не
  // склеивается повторно — в заказ уходит один полный маршрут.
  assert.deepEqual(plan.passengers.map((passenger) => passenger.name), ['ИВАНОВ ИВАН', 'ПЕТРОВ ПЁТР']);
  assert.deepEqual(plan.points.map((point) => point.location_code), ['SVO', 'DXB', 'SVO']);
  assert.equal(plan.kind, 'round_trip');
  assert.equal(plan.plannedStart, '2026-03-10');
  assert.equal(plan.plannedEnd, '2026-03-20');
  assert.deepEqual(plan.serviceKinds, ['Авиа']);
  assert.equal(plan.currency, 'RUB');
  assert.equal(plan.blankCount, 2);
  assert.equal(plan.truncatedPoints, 0);
});

test('ten identical blanks give one route, not ten glued copies', () => {
  const { receiptOrderPlan } = loadPlanHelpers();
  const blank = (name) => ({
    type: 'Авиа',
    parsed: {
      currency: 'RUB', tripType: 'roundtrip',
      passengers: [{ name }],
      legs: [
        { fromCode: 'SVO', from: 'Москва', toCode: 'DXB', to: 'Дубай', date: '10.03.2026' },
        { fromCode: 'DXB', from: 'Дубай', toCode: 'SVO', to: 'Москва', date: '20.03.2026' },
      ],
    },
  });
  const plan = receiptOrderPlan(['АВРАМОВ', 'БАЛАНОВ', 'ВАСИЛЬЕВ', 'ГАЛОЧКИН', 'ГОРБУНОВ',
    'ГРИШИН', 'ДИМИТРОВ', 'ДМИТРИЕВ', 'ЗНАХАРЕНКО', 'ИБРАГИМОВ'].map(blank));

  assert.equal(plan.passengers.length, 10);
  assert.deepEqual(plan.points.map((point) => point.location_code), ['SVO', 'DXB', 'SVO']);
  assert.equal(plan.kind, 'round_trip');
  assert.equal(plan.blankCount, 10);
});

test('a long multi-city route stays inside the backend segment limit', () => {
  const { receiptOrderPlan } = loadPlanHelpers();
  const leg = (from, to) => ({ fromCode: from, from, toCode: to, to, date: '01.04.2026' });
  const plan = receiptOrderPlan([{
    type: 'Авиа',
    parsed: {
      currency: 'USD',
      passengers: [{ name: 'ТЕСТ ПАССАЖИР' }],
      legs: [leg('A', 'B'), leg('B', 'C'), leg('C', 'D'), leg('D', 'E'), leg('E', 'F'), leg('F', 'G'), leg('G', 'H')],
    },
  }]);
  assert.equal(plan.points.length, 7);
  assert.equal(plan.truncatedPoints, 1);
  assert.equal(plan.kind, 'multi_city');
});
