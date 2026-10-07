import test from 'node:test';
import assert from 'node:assert/strict';
import { hotelPlainText, hotelBedDescription, hotelCancellationDescription, hotelPaymentDescription } from '../src/modules/services/hotels/presentation.js';

test('bed descriptions retain useful names and hide supplier-generated labels', () => {
  assert.equal(hotelBedDescription('Трехместная кровать, autobedtype1522792861848, autobedtype1523224955372'), 'Трехместная кровать');
  assert.equal(hotelBedDescription('autobedtype1522792861848'), 'Тип кровати не указан');
  assert.equal(hotelBedDescription('Twin, Double'), 'Twin, Double');
});

test('supplier HTML information becomes plain readable text', () => {
  assert.equal(hotelPlainText('<p>Внимание! Отель <strong>ДЛЯ ТЕСТОВ!</strong></p><p>Оплата&nbsp;в отеле &amp; налог.</p>'), 'Внимание! Отель ДЛЯ ТЕСТОВ!\n\nОплата в отеле & налог.');
  assert.equal(hotelPlainText('<script>alert(1)</script>Условия'), 'Условия');
});

test('cancellation penalties retain amount, currency, timezone and supplier explanation', () => {
  const fare = { cancel: [{ from: '2026-10-18T00:00:00+03:00', price: { amount: '682', currency: 'RUB' } }], cancellation_information: ['Неявка — 100%.'] };
  assert.equal(hotelCancellationDescription(fare), 'С 18.10.2026, 00:00 (UTC+03:00) — штраф 682 ₽\nНеявка — 100%.');
  assert.equal(hotelCancellationDescription({}, '2026-10-18T00:00:00+03:00: 682 RUB'), 'С 18.10.2026, 00:00 (UTC+03:00) — штраф 682 ₽');
  assert.match(hotelCancellationDescription({ cancel: [{ price: { amount: 0, currency: 'EUR' } }] }), /без штрафа/);
});

test('unknown payment conditions never claim online prepayment', () => {
  assert.equal(hotelPaymentDescription(null), 'Оплата по условиям тарифа');
  assert.equal(hotelPaymentDescription(false), 'Предоплата');
  assert.equal(hotelPaymentDescription(true), 'Оплата в отеле');
});
