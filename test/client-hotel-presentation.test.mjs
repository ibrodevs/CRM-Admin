import test from 'node:test';
import assert from 'node:assert/strict';
import { clientHotelCard, clientHotelText } from '../src/shared/lib/client-hotel-presentation.js';

test('hotel guest presentation hides internal costs and IDs while preserving penalty and hotel confirmation', () => {
  const original = { supplier: 'HbPro', orderNo: 'ORD-000026', title: 'Гостиница',
    info: [{ l: 'Стоимость поставщика', v: '891.23 RUB' }, { l: 'Заказ', v: 'ORD-000026' },
      { l: 'Условия отмены', v: 'HbPro: штраф 250 RUB с 10.12.2026' }, { l: 'Бронь отеля', v: 'HOTEL-123' }],
    fin: { supplierPrice: 891.23, cost: 891.23, profit: 108.77, clientTotal: 1000, fee: 50, model: { total: 1000 } } };
  const before = JSON.stringify(original);
  const result = clientHotelCard(original);
  const rendered = JSON.stringify(result);
  for (const secret of ['891.23', '108.77', 'HbPro', 'ORD-000026', 'supplierPrice']) assert.ok(!rendered.includes(secret));
  assert.equal(result.fin.clientTotal, 1000);
  assert.equal(result.fin.model.total, 1000);
  assert.ok(rendered.includes('250 RUB с 10.12.2026'));
  assert.ok(rendered.includes('HOTEL-123'));
  assert.equal(JSON.stringify(original), before, 'operator state is unchanged');
});
test('supplier aliases and exact internal references are removed without changing dates or penalties', () => {
  assert.equal(clientHotelText('хотелбук: штраф 120 RUB; заказ 12345', ['12345']), 'поставщик услуг: штраф 120 RUB; заказ');
  assert.equal(clientHotelText('Отель 123456, штраф 123 RUB', ['12345']), 'Отель 123456, штраф 123 RUB');
});
